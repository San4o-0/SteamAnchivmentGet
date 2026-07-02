/* Steam achievement unlocking core for SAM.Agent.
 *
 * Wraps SAM.API (steamclient.dll interop) with the exact flow proven in
 * SAM.Game/Manager.cs:
 *
 *   Initialize(appId)
 *     -> SteamUser.GetSteamId()
 *     -> SteamUserStats.RequestUserStats(steamId)
 *     -> pump RunCallbacks() until the UserStatsReceived callback fires
 *     -> SetAchievement(id, true) for each achievement
 *     -> StoreStats()
 *     -> Dispose()
 *
 * The steamclient interop is single-appId per client, so every request
 * builds a fresh client for one appId. All Steam access is serialized
 * behind a lock because the underlying native client is not designed for
 * concurrent callers.
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using Microsoft.Win32;
using API = SAM.API;

namespace SAM.Agent
{
    internal sealed class SteamUnlocker
    {
        /// <summary>How long to wait for the UserStatsReceived callback.</summary>
        private static readonly TimeSpan StatsTimeout = TimeSpan.FromSeconds(10);

        // Serializes all steamclient.dll access: only one client may be live at a time.
        private readonly object _steamLock = new object();

        #region Result types

        public struct AchievementResult
        {
            public string Id;
            public bool Ok;
            public string Error;
        }

        public sealed class UnlockResult
        {
            public bool Ok;
            public string Error;
            public List<AchievementResult> Results = new List<AchievementResult>();
        }

        #endregion

        #region Health

        /// <summary>
        /// True when a Steam client process appears to be running and reachable.
        /// Uses the registry ActiveProcess pid (set by a live Steam client) and
        /// falls back to enumerating processes named "steam".
        /// </summary>
        public static bool IsSteamRunning()
        {
            try
            {
                if (string.IsNullOrEmpty(API.Steam.GetInstallPath()))
                {
                    return false;
                }
            }
            catch
            {
                // Registry unreadable (e.g. locked-down environment): treat as not installed.
                return false;
            }

            try
            {
                object pidValue = Registry.GetValue(
                    @"HKEY_CURRENT_USER\Software\Valve\Steam\ActiveProcess", "pid", 0);
                if (pidValue is int pid && pid != 0)
                {
                    try
                    {
                        // Throws ArgumentException if no such process is alive.
                        using (Process.GetProcessById(pid))
                        {
                            return true;
                        }
                    }
                    catch (ArgumentException)
                    {
                        // Stale pid; fall through to the process-name check.
                    }
                }
            }
            catch
            {
                // Registry unavailable; fall through.
            }

            try
            {
                return Process.GetProcessesByName("steam").Length > 0;
            }
            catch
            {
                return false;
            }
        }

        #endregion

        #region Unlock

        /// <summary>Unlock a single achievement.</summary>
        public UnlockResult Unlock(long appId, string achievementId)
        {
            return UnlockMany(appId, new List<string> { achievementId });
        }

        /// <summary>
        /// Unlock one or more achievements for a single appId using one Steam client.
        /// </summary>
        public UnlockResult UnlockMany(long appId, IReadOnlyList<string> achievementIds)
        {
            var result = new UnlockResult();

            if (appId <= 0)
            {
                result.Ok = false;
                result.Error = "invalid appId";
                return result;
            }

            if (achievementIds == null || achievementIds.Count == 0)
            {
                result.Ok = false;
                result.Error = "no achievement ids provided";
                return result;
            }

            lock (_steamLock)
            {
                API.Client client = null;
                try
                {
                    client = new API.Client();

                    try
                    {
                        client.Initialize(appId);
                    }
                    catch (API.ClientInitializeException e)
                    {
                        result.Ok = false;
                        result.Error = DescribeInitFailure(e);
                        return result;
                    }
                    catch (DllNotFoundException)
                    {
                        result.Ok = false;
                        result.Error = "steamclient.dll could not be loaded";
                        return result;
                    }

                    // Ask Steam for the current user's stats for this app and wait
                    // for the asynchronous UserStatsReceived callback.
                    if (!RequestStats(client, out string statsError))
                    {
                        result.Ok = false;
                        result.Error = statsError;
                        return result;
                    }

                    // Apply each achievement.
                    bool anyChanged = false;
                    foreach (string id in achievementIds)
                    {
                        var one = new AchievementResult { Id = id };
                        if (string.IsNullOrEmpty(id))
                        {
                            one.Ok = false;
                            one.Error = "empty achievement id";
                        }
                        else if (client.SteamUserStats.SetAchievement(id, true))
                        {
                            one.Ok = true;
                            anyChanged = true;
                        }
                        else
                        {
                            one.Ok = false;
                            one.Error = "SetAchievement failed (unknown achievement id for this app?)";
                        }
                        result.Results.Add(one);
                    }

                    // Persist to Steam. Only meaningful if at least one SetAchievement succeeded,
                    // but we still store to flush any partial state.
                    if (anyChanged)
                    {
                        if (!client.SteamUserStats.StoreStats())
                        {
                            result.Ok = false;
                            result.Error = "StoreStats failed";
                            // Mark the individual achievements as not persisted.
                            for (int i = 0; i < result.Results.Count; i++)
                            {
                                var r = result.Results[i];
                                if (r.Ok)
                                {
                                    r.Ok = false;
                                    r.Error = "StoreStats failed";
                                    result.Results[i] = r;
                                }
                            }
                            return result;
                        }

                        // Give Steam a brief window to process the store callback.
                        PumpCallbacks(client, TimeSpan.FromMilliseconds(500));
                    }

                    // Overall ok when every requested achievement was set.
                    result.Ok = true;
                    foreach (var r in result.Results)
                    {
                        if (!r.Ok)
                        {
                            result.Ok = false;
                            break;
                        }
                    }
                    if (!result.Ok && result.Error == null)
                    {
                        result.Error = "one or more achievements failed";
                    }
                    return result;
                }
                catch (Exception e)
                {
                    result.Ok = false;
                    result.Error = "unexpected error: " + e.Message;
                    return result;
                }
                finally
                {
                    client?.Dispose();
                }
            }
        }

        /// <summary>
        /// Issues RequestUserStats and pumps callbacks until UserStatsReceived
        /// fires (Result==1) or the timeout elapses.
        /// </summary>
        private static bool RequestStats(API.Client client, out string error)
        {
            error = null;

            bool received = false;
            int callbackResult = 0;

            var callback = client.CreateAndRegisterCallback<API.Callbacks.UserStatsReceived>();
            callback.OnRun += param =>
            {
                received = true;
                callbackResult = param.Result;
            };

            ulong steamId = client.SteamUser.GetSteamId();
            API.CallHandle handle = client.SteamUserStats.RequestUserStats(steamId);
            if (handle == API.CallHandle.Invalid)
            {
                error = "failed to request user stats (RequestUserStats returned invalid handle)";
                return false;
            }

            var stopwatch = Stopwatch.StartNew();
            while (!received && stopwatch.Elapsed < StatsTimeout)
            {
                client.RunCallbacks(false);
                Thread.Sleep(50);
            }

            if (!received)
            {
                error = "timed out waiting for user stats from Steam";
                return false;
            }

            if (callbackResult != 1)
            {
                error = "Steam returned an error while retrieving stats (result=" + callbackResult + ")";
                return false;
            }

            return true;
        }

        private static void PumpCallbacks(API.Client client, TimeSpan duration)
        {
            var stopwatch = Stopwatch.StartNew();
            while (stopwatch.Elapsed < duration)
            {
                client.RunCallbacks(false);
                Thread.Sleep(50);
            }
        }

        private static string DescribeInitFailure(API.ClientInitializeException e)
        {
            switch (e.Failure)
            {
                case API.ClientInitializeFailure.GetInstallPath:
                    return "Steam install path not found (is Steam installed?)";
                case API.ClientInitializeFailure.Load:
                    return "failed to load steamclient.dll";
                case API.ClientInitializeFailure.CreateSteamClient:
                    return "failed to create the Steam client interface";
                case API.ClientInitializeFailure.CreateSteamPipe:
                    return "failed to create a Steam pipe (is Steam running?)";
                case API.ClientInitializeFailure.ConnectToGlobalUser:
                    return "Steam is not running, or the game is locked by Family Share";
                case API.ClientInitializeFailure.AppIdMismatch:
                    return "appId mismatch: Steam reported a different running app";
                default:
                    return string.IsNullOrEmpty(e.Message) ? "failed to initialize Steam client" : e.Message;
            }
        }

        #endregion
    }
}
