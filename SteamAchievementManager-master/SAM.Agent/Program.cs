/* SAM.Agent - local background unlock service built on SAM.API.
 *
 * Exposes the local-agent side of the Shared Contract over loopback HTTP.
 * This is the only component that can physically set achievements, because
 * it talks to steamclient.dll on the machine where Steam runs.
 */

using System;
using System.Threading;

namespace SAM.Agent
{
    internal static class Program
    {
        private static readonly ManualResetEvent Shutdown = new ManualResetEvent(false);

        public static int Main(string[] args)
        {
            HttpServer server;
            try
            {
                server = new HttpServer();
                server.Start();
            }
            catch (Exception e)
            {
                Console.Error.WriteLine("Failed to start SAM.Agent HTTP server: " + e.Message);
                Console.Error.WriteLine("If another instance is already running, stop it first.");
                return 1;
            }

            Console.WriteLine("SAM.Agent listening on " + server.Url);
            Console.WriteLine("Endpoints: GET /health, POST /unlock, POST /unlock/batch");
            Console.WriteLine("Steam running: " + SteamUnlocker.IsSteamRunning());
            Console.WriteLine("Press Ctrl+C to stop.");

            Console.CancelKeyPress += (_, e) =>
            {
                e.Cancel = true; // Perform a graceful shutdown instead of hard-killing.
                Shutdown.Set();
            };

            Shutdown.WaitOne();

            Console.WriteLine("Shutting down...");
            server.Dispose();
            return 0;
        }
    }
}
