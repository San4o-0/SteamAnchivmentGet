/* Loopback-only HTTP server for SAM.Agent.
 *
 * Implements the local-agent side of the Shared Contract:
 *
 *   GET  /health                        -> { steamRunning, version }
 *   POST /unlock       { appId, achievementId } -> { ok, error? }
 *   POST /unlock/batch { appId, ids:[..] }       -> { ok, results:[{id,ok}] }
 *
 * Built on System.Net.HttpListener so the whole agent stays on net48/x86
 * with no external packages. Binding to the explicit loopback IP
 * (127.0.0.1) does not require an admin URL ACL reservation.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;

namespace SAM.Agent
{
    internal sealed class HttpServer : IDisposable
    {
        private const string Host = "127.0.0.1";
        private const int Port = 57343;

        private readonly HttpListener _listener = new HttpListener();
        private readonly SteamUnlocker _unlocker = new SteamUnlocker();
        private readonly string _version;
        private volatile bool _running;

        public HttpServer()
        {
            _listener.Prefixes.Add($"http://{Host}:{Port}/");
            _version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
        }

        public string Url => $"http://{Host}:{Port}";

        public void Start()
        {
            _listener.Start();
            _running = true;
            _listener.BeginGetContext(OnContext, null);
        }

        public void Stop()
        {
            _running = false;
            try { _listener.Stop(); } catch { /* ignore */ }
        }

        public void Dispose()
        {
            Stop();
            try { _listener.Close(); } catch { /* ignore */ }
        }

        private void OnContext(IAsyncResult ar)
        {
            HttpListenerContext context;
            try
            {
                context = _listener.EndGetContext(ar);
            }
            catch
            {
                return; // Listener stopped.
            }

            // Queue the next accept immediately so requests can overlap
            // (Steam work itself is serialized inside SteamUnlocker).
            if (_running)
            {
                try { _listener.BeginGetContext(OnContext, null); }
                catch { /* listener stopping */ }
            }

            try
            {
                Handle(context);
            }
            catch (Exception e)
            {
                TryWriteError(context, 500, "internal error: " + e.Message);
            }
        }

        private void Handle(HttpListenerContext context)
        {
            HttpListenerRequest request = context.Request;

            // Defense in depth: refuse anything that is not loopback.
            if (!request.IsLocal || !IPAddress.IsLoopback(request.RemoteEndPoint.Address))
            {
                WriteJson(context, 403, new Dictionary<string, object> { ["error"] = "forbidden: localhost only" });
                return;
            }

            AddCorsHeaders(context.Response);

            if (request.HttpMethod == "OPTIONS")
            {
                // CORS preflight.
                context.Response.StatusCode = 204;
                context.Response.Close();
                return;
            }

            string path = request.Url.AbsolutePath.TrimEnd('/');
            if (path.Length == 0) { path = "/"; }

            switch (path)
            {
                case "/health":
                    if (request.HttpMethod != "GET") { MethodNotAllowed(context); return; }
                    HandleHealth(context);
                    break;

                case "/unlock":
                    if (request.HttpMethod != "POST") { MethodNotAllowed(context); return; }
                    HandleUnlock(context);
                    break;

                case "/unlock/batch":
                    if (request.HttpMethod != "POST") { MethodNotAllowed(context); return; }
                    HandleUnlockBatch(context);
                    break;

                default:
                    WriteJson(context, 404, new Dictionary<string, object> { ["error"] = "not found" });
                    break;
            }
        }

        #region Handlers

        private void HandleHealth(HttpListenerContext context)
        {
            var body = new Dictionary<string, object>
            {
                ["steamRunning"] = SteamUnlocker.IsSteamRunning(),
                ["version"] = _version,
            };
            WriteJson(context, 200, body);
        }

        private void HandleUnlock(HttpListenerContext context)
        {
            if (!TryReadBody(context, out Dictionary<string, object> obj, out string readError))
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = readError });
                return;
            }

            if (!MiniJson.TryGetAppId(obj, "appId", out long appId))
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = "missing or invalid 'appId'" });
                return;
            }

            if (!MiniJson.TryGetString(obj, "achievementId", out string achievementId) || string.IsNullOrEmpty(achievementId))
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = "missing 'achievementId'" });
                return;
            }

            SteamUnlocker.UnlockResult result = _unlocker.Unlock(appId, achievementId);

            var body = new Dictionary<string, object> { ["ok"] = result.Ok };
            if (!result.Ok && !string.IsNullOrEmpty(result.Error))
            {
                body["error"] = result.Error;
            }
            WriteJson(context, 200, body);
        }

        private void HandleUnlockBatch(HttpListenerContext context)
        {
            if (!TryReadBody(context, out Dictionary<string, object> obj, out string readError))
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = readError });
                return;
            }

            if (!MiniJson.TryGetAppId(obj, "appId", out long appId))
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = "missing or invalid 'appId'" });
                return;
            }

            List<string> ids = MiniJson.GetStringList(obj, "ids");
            if (ids.Count == 0)
            {
                WriteJson(context, 400, new Dictionary<string, object> { ["ok"] = false, ["error"] = "missing or empty 'ids'" });
                return;
            }

            SteamUnlocker.UnlockResult result = _unlocker.UnlockMany(appId, ids);

            var resultsArray = new List<object>();
            foreach (SteamUnlocker.AchievementResult r in result.Results)
            {
                var item = new Dictionary<string, object> { ["id"] = r.Id, ["ok"] = r.Ok };
                if (!r.Ok && !string.IsNullOrEmpty(r.Error))
                {
                    item["error"] = r.Error;
                }
                resultsArray.Add(item);
            }

            var body = new Dictionary<string, object>
            {
                ["ok"] = result.Ok,
                ["results"] = resultsArray,
            };
            if (!result.Ok && !string.IsNullOrEmpty(result.Error))
            {
                body["error"] = result.Error;
            }
            WriteJson(context, 200, body);
        }

        #endregion

        #region Helpers

        private static bool TryReadBody(HttpListenerContext context, out Dictionary<string, object> obj, out string error)
        {
            obj = null;
            error = null;
            try
            {
                string raw;
                using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding ?? Encoding.UTF8))
                {
                    raw = reader.ReadToEnd();
                }
                if (string.IsNullOrWhiteSpace(raw))
                {
                    error = "empty request body";
                    return false;
                }
                obj = MiniJson.ParseObject(raw);
                return true;
            }
            catch (Exception e)
            {
                error = "invalid JSON body: " + e.Message;
                return false;
            }
        }

        private static void MethodNotAllowed(HttpListenerContext context)
        {
            WriteJson(context, 405, new Dictionary<string, object> { ["error"] = "method not allowed" });
        }

        private static void AddCorsHeaders(HttpListenerResponse response)
        {
            response.AddHeader("Access-Control-Allow-Origin", "*");
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
        }

        private static void WriteJson(HttpListenerContext context, int statusCode, object body)
        {
            byte[] buffer = Encoding.UTF8.GetBytes(MiniJson.Serialize(body));
            HttpListenerResponse response = context.Response;
            response.StatusCode = statusCode;
            response.ContentType = "application/json";
            response.ContentEncoding = Encoding.UTF8;
            response.ContentLength64 = buffer.Length;
            using (Stream output = response.OutputStream)
            {
                output.Write(buffer, 0, buffer.Length);
            }
        }

        private static void TryWriteError(HttpListenerContext context, int statusCode, string message)
        {
            try
            {
                WriteJson(context, statusCode, new Dictionary<string, object> { ["ok"] = false, ["error"] = message });
            }
            catch
            {
                try { context.Response.Abort(); } catch { /* ignore */ }
            }
        }

        #endregion
    }
}
