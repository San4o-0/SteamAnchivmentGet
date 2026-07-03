// Persistent local overlay of achievements the user unlocked via the agent.
//
// Unlock goes browser → agent → Steam DIRECTLY, so the hosted backend never
// learns about it and keeps serving stale "locked" data: its own ~10-min cache
// over the Steam Web API (see backend steam/client.py `ach:` ttl=600) PLUS
// Steam's own propagation lag before GetPlayerAchievements reflects the change.
// Without this overlay a page reload shows a just-unlocked achievement as locked
// again until the backend catches up.
//
// We remember unlocked ids locally, merge them over backend data (see hooks.ts),
// and DROP each id once the backend itself reports it unlocked. As a safety valve
// each entry also EXPIRES after TTL_MS: if the backend never confirms it (e.g. the
// agent reported ok but Steam reverted a protected/stat-gated achievement), the
// stale entry self-destructs instead of masking the real locked state forever.

const KEY = "sam.unlocked";

// If the backend hasn't confirmed an unlock within a day, treat it as never
// stuck and stop overriding — normal convergence is minutes (cache + API lag),
// so a day is a generous margin that still self-heals false positives.
const TTL_MS = 24 * 60 * 60 * 1000;

type Store = Record<string, Record<string, number>>; // appId -> { achId -> unlockedAtMs }

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage disabled / full — overlay is best-effort, not critical */
  }
}

// Drop expired ids (and now-empty apps) in place. Returns true if it changed
// anything, so callers can decide whether to persist.
function dropExpired(store: Store, now: number): boolean {
  let changed = false;
  for (const appId of Object.keys(store)) {
    const entries = store[appId];
    for (const id of Object.keys(entries)) {
      if (now - entries[id] >= TTL_MS) {
        delete entries[id];
        changed = true;
      }
    }
    if (Object.keys(entries).length === 0) {
      delete store[appId];
      changed = true;
    }
  }
  return changed;
}

/** Remember achievements just unlocked for an app. */
export function recordUnlocked(appId: number, ids: string[]): void {
  if (ids.length === 0) return;
  const now = Date.now();
  const store = read();
  dropExpired(store, now); // opportunistic cleanup while we're writing anyway
  const entries = (store[String(appId)] ??= {});
  ids.forEach((id) => {
    entries[id] = now;
  });
  write(store);
}

/** Ids to treat as unlocked for an app, on top of whatever the backend says. */
export function getUnlockedOverlay(appId: number): Set<string> {
  const now = Date.now();
  const entries = read()[String(appId)] ?? {};
  const live = Object.keys(entries).filter((id) => now - entries[id] < TTL_MS);
  return new Set(live);
}

/**
 * Drop overlay ids the backend now confirms as unlocked. Called with fresh
 * authoritative data so the overlay converges to empty once Steam/backend catch
 * up — keeping it from masking a real re-lock or growing without bound.
 */
export function pruneConfirmed(
  appId: number,
  confirmedUnlockedIds: Iterable<string>,
): void {
  const store = read();
  const k = String(appId);
  const entries = store[k];
  if (!entries) return;
  let changed = dropExpired(store, Date.now());
  for (const id of confirmedUnlockedIds) {
    if (store[k] && id in store[k]) {
      delete store[k][id];
      changed = true;
    }
  }
  if (store[k] && Object.keys(store[k]).length === 0) {
    delete store[k];
    changed = true;
  }
  if (changed) write(store);
}
