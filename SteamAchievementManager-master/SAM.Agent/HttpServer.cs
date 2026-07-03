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
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SAM.Agent
{
    internal sealed class HttpServer : IDisposable
    {
        private const string Host = "127.0.0.1";
        private const int Port = 57343;
        private const long MaxBodyBytes = 64 * 1024; // ліміт тіла запиту (DoS-захист)

        // Steam init + RequestUserStats can take up to ~10s; a worker also spawns
        // a fresh process and loads steamclient.dll. Give it generous headroom.
        private const int WorkerTimeoutMs = 30_000;

        // Origin-allowlist: лише ці сайти можуть керувати агентом. Дефолт — dev
        // + прод (achivo.pages.dev). Додаткові домени — через env
        // ACHIVO_ALLOWED_ORIGINS (кома-розділені), напр. власний кастомний домен.
        private static readonly HashSet<string> AllowedOrigins = LoadAllowedOrigins();

        private static HashSet<string> LoadAllowedOrigins()
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://achivo.pages.dev",
            };
            string extra = Environment.GetEnvironmentVariable("ACHIVO_ALLOWED_ORIGINS");
            if (!string.IsNullOrEmpty(extra))
            {
                foreach (string o in extra.Split(','))
                {
                    string trimmed = o.Trim().TrimEnd('/');
                    if (trimmed.Length > 0) { set.Add(trimmed); }
                }
            }
            return set;
        }

        private static bool IsOriginAllowed(string origin)
        {
            return origin != null && AllowedOrigins.Contains(origin.TrimEnd('/'));
        }

        // Захист від DNS-rebinding: приймаємо лише звернення на loopback-host.
        private static bool IsHostAllowed(string host)
        {
            return host == Host + ":" + Port
                || host == "localhost:" + Port
                || host == Host
                || host == "localhost";
        }

        // No SteamUnlocker here on purpose: the server process must NEVER call
        // Initialize(appId), or it would bind steamclient to one appId for its
        // whole life. All Steam work runs in short-lived worker subprocesses.
        private readonly HttpListener _listener = new HttpListener();
        private readonly string _version;
        private volatile bool _running;

        public HttpServer()
        {
            _listener.Prefixes.Add($"http://{Host}:{Port}/");
            _version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.1.0";
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

            // DNS-rebinding guard: Host must be our loopback host, not attacker.com.
            if (!IsHostAllowed(request.Headers["Host"] ?? string.Empty))
            {
                WriteJson(context, 403, new Dictionary<string, object> { ["error"] = "forbidden host" });
                return;
            }

            // Origin allowlist: a cross-site page's fetch/XHR carries an Origin;
            // if it is not the Achivo web app, refuse — otherwise ANY site the
            // user visits could drive /unlock. Origin absent (native tools,
            // same-origin) is allowed. This 403 also fails the CORS preflight,
            // so the browser never sends the real POST from a foreign origin.
            string origin = request.Headers["Origin"];
            if (origin != null && !IsOriginAllowed(origin))
            {
                WriteJson(context, 403, new Dictionary<string, object> { ["error"] = "forbidden origin" });
                return;
            }

            AddCorsHeaders(context.Response, origin);

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

                case "/progress":
                    if (request.HttpMethod != "POST") { MethodNotAllowed(context); return; }
                    HandleProgress(context);
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

            string payload = MiniJson.Serialize(new Dictionary<string, object>
            {
                ["appId"] = appId,
                ["ids"] = new List<object> { achievementId },
            });
            RelayWorker(context, "--unlock", payload);
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

            var idList = new List<object>();
            foreach (string id in ids) { idList.Add(id); }
            string payload = MiniJson.Serialize(new Dictionary<string, object>
            {
                ["appId"] = appId,
                ["ids"] = idList,
            });
            RelayWorker(context, "--unlock", payload);
        }

        private void HandleProgress(HttpListenerContext context)
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

            string payload = MiniJson.Serialize(new Dictionary<string, object> { ["appId"] = appId });
            RelayWorker(context, "--progress", payload);
        }

        #endregion

        #region Worker subprocess

        // Spawns a fresh copy of this exe in the given worker mode, feeds it the
        // JSON payload on stdin, and relays its stdout (the contract response)
        // verbatim to the HTTP caller. A fresh process per call is what lets us
        // init a different appId each time (steamclient binds one per process).
        private void RelayWorker(HttpListenerContext context, string mode, string payload)
        {
            string output = RunWorker(mode, payload);
            if (output == null)
            {
                WriteJson(context, 200, new Dictionary<string, object>
                {
                    ["ok"] = false,
                    ["error"] = "the unlock worker failed or timed out",
                });
                return;
            }
            WriteRawJson(context, 200, output);
        }

        private static string RunWorker(string mode, string stdinJson)
        {
            string exePath = Assembly.GetExecutingAssembly().Location;
            var psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = mode,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };

            Process proc = null;
            try
            {
                proc = Process.Start(psi);
                if (proc == null) { return null; }

                // Drain stdout/stderr asynchronously to avoid a pipe-buffer
                // deadlock, then feed the (small) payload and close stdin so the
                // worker's Console.In.ReadToEnd() returns.
                Task<string> stdout = proc.StandardOutput.ReadToEndAsync();
                Task<string> stderr = proc.StandardError.ReadToEndAsync();
                proc.StandardInput.Write(stdinJson);
                proc.StandardInput.Close();

                if (!proc.WaitForExit(WorkerTimeoutMs))
                {
                    try { proc.Kill(); } catch { /* already exiting */ }
                    return null;
                }

                Task.WaitAll(new Task[] { stdout, stderr }, 2000);
                return ExtractJson(stdout.Result);
            }
            catch
            {
                return null;
            }
            finally
            {
                proc?.Dispose();
            }
        }

        // steamclient.dll can spew its own log lines to stdout when a worker
        // connects. Our response is a single JSON object, so keep only the span
        // from the first '{' to the last '}' and drop any surrounding noise.
        private static string ExtractJson(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) { return null; }
            int start = raw.IndexOf('{');
            int end = raw.LastIndexOf('}');
            if (start < 0 || end < start) { return null; }
            return raw.Substring(start, end - start + 1);
        }

        private static void WriteRawJson(HttpListenerContext context, int statusCode, string json)
        {
            byte[] buffer = Encoding.UTF8.GetBytes(json);
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

        #endregion

        #region Helpers

        private static bool TryReadBody(HttpListenerContext context, out Dictionary<string, object> obj, out string error)
        {
            obj = null;
            error = null;
            // Cap body size (DoS): reject an oversized/declared-huge payload before
            // allocating. Unknown length (-1, chunked) is not used by our clients.
            long declared = context.Request.ContentLength64;
            if (declared > MaxBodyBytes)
            {
                error = "request body too large";
                return false;
            }
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

        private static void AddCorsHeaders(HttpListenerResponse response, string origin)
        {
            // Reflect ONLY an allow-listed origin (never `*`). Origin is null for
            // native/same-origin callers — then no ACAO is needed.
            if (!string.IsNullOrEmpty(origin))
            {
                response.AddHeader("Access-Control-Allow-Origin", origin);
                response.AddHeader("Vary", "Origin");
            }
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
            // Chrome Private Network Access: a request from a public HTTPS site
            // (achivo.app) to a loopback address is a "private network request".
            // The browser sends a preflight with Access-Control-Request-Private-
            // Network: true, and blocks the call unless we grant it explicitly.
            response.AddHeader("Access-Control-Allow-Private-Network", "true");
            // Cache the preflight for 10 min so we are not re-asked on every call.
            response.AddHeader("Access-Control-Max-Age", "600");
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
