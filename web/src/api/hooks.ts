import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { agentHealth, agentProgress, agentUnlock } from "./agent";
import {
  getUnlockedOverlay,
  pruneConfirmed,
  recordUnlocked,
} from "./unlockOverlay";
import type {
  FriendsResponse,
  GameDetail,
  LeaderboardEntry,
  LibraryEntry,
  MarkNotificationsReadResponse,
  Me,
  Notification,
  PlayerProfile,
  Roadmap,
  Settings,
  Stats,
} from "./types";

// Merge the local "just unlocked" overlay onto a game's achievements, so a
// reload keeps showing them done while the backend cache / Steam Web API lag.
// Also recomputes completion (backend formula: done / total * 100, 1 decimal)
// so the header % stays consistent with the flipped achievements.
function mergeOverlayIntoGame(appId: number, game: GameDetail): GameDetail {
  const overlay = getUnlockedOverlay(appId);
  if (overlay.size === 0) return game;
  let changed = false;
  const achievements = game.achievements.map((a) => {
    if (a.unlocked || !overlay.has(a.id)) return a;
    changed = true;
    return { ...a, unlocked: true };
  });
  if (!changed) return game;
  const done = achievements.filter((a) => a.unlocked).length;
  const completion = achievements.length
    ? Math.round((done / achievements.length) * 1000) / 10
    : game.completion;
  return { ...game, achievements, completion };
}

export const keys = {
  me: ["me"] as const,
  library: ["library"] as const,
  game: (appId: number) => ["game", appId] as const,
  roadmap: (appId: number) => ["roadmap", appId] as const,
  health: ["health"] as const,
  agentProgress: (appId: number) => ["agentProgress", appId] as const,
  stats: ["stats"] as const,
  settings: ["settings"] as const,
  leaderboard: ["leaderboard"] as const,
  notifications: ["notifications"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<Me>("/api/me"),
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: keys.library,
    queryFn: () => api.get<LibraryEntry[]>("/api/library"),
  });
}

export function useGame(appId: number) {
  return useQuery({
    queryKey: keys.game(appId),
    queryFn: async () => {
      const game = await api.get<GameDetail>(`/api/game/${appId}`);
      // Fresh authoritative data → drop overlay ids the backend now confirms.
      pruneConfirmed(
        appId,
        game.achievements.filter((a) => a.unlocked).map((a) => a.id),
      );
      return game;
    },
    enabled: Number.isFinite(appId),
    select: (game) => mergeOverlayIntoGame(appId, game),
  });
}

export function useRoadmap(appId: number) {
  return useQuery({
    queryKey: keys.roadmap(appId),
    queryFn: () => api.get<Roadmap>(`/api/game/${appId}/roadmap`),
    enabled: Number.isFinite(appId),
    // Roadmap lists only locked achievements; hide any the user just unlocked.
    select: (roadmap) => {
      const overlay = getUnlockedOverlay(appId);
      if (overlay.size === 0) return roadmap;
      const steps = roadmap.steps.filter((s) => !overlay.has(s.ach.id));
      return steps.length === roadmap.steps.length ? roadmap : { ...roadmap, steps };
    },
  });
}

// Health читаємо НАПРЯМУ з локального агента (127.0.0.1:57343), а не через
// бекенд: захостений бекенд не бачить чужого loopback. Помилка = агент офлайн
// (показуємо банером), не блокує решту UI.
export function useAgentHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: () => agentHealth(),
    refetchInterval: 15_000,
    retry: false,
    staleTime: 10_000,
  });
}

// Прогрес/захищені ачивки читаємо НАПРЯМУ з агента (POST /progress). Повертає
// { progress: { <id>: {min,max} } } — які ачивки стат-гейтовані. Помилка (агент
// офлайн) не критична: тоді просто нема гейтингу. Набір статичний на гру, тож
// кешуємо надовго.
export function useAgentProgress(appId: number) {
  return useQuery({
    queryKey: keys.agentProgress(appId),
    queryFn: () => agentProgress(appId),
    enabled: Number.isFinite(appId),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

// Unlock теж іде НАПРЯМУ в агент (POST /unlock/batch). Після успіху інвалідуємо
// game/roadmap/library/me, щоб UI підтягнув новий стан із бекенду.
export function useUnlock(appId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => agentUnlock(appId, ids),
    onSuccess: (res, ids) => {
      // Persist locally so a reload keeps them unlocked until the backend (its
      // 10-min cache + Steam Web API lag) catches up. Trust per-id results when
      // present; fall back to the requested ids if the agent omitted them.
      const unlocked = res.results?.length
        ? res.results.filter((r) => r.ok).map((r) => r.id)
        : ids;
      recordUnlocked(appId, unlocked);
      qc.invalidateQueries({ queryKey: keys.game(appId) });
      qc.invalidateQueries({ queryKey: keys.roadmap(appId) });
      qc.invalidateQueries({ queryKey: keys.library });
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

// Агрегована статистика профілю.
export function useStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: () => api.get<Stats>("/api/stats"),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api.get<Settings>("/api/settings"),
  });
}

// PUT повертає збережене значення — одразу кладемо у кеш + інвалідуємо.
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Settings) =>
      api.put<Settings>("/api/settings", settings),
    onSuccess: (data) => {
      qc.setQueryData(keys.settings, data);
      qc.invalidateQueries({ queryKey: keys.settings });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: keys.leaderboard,
    queryFn: () => api.get<LeaderboardEntry[]>("/api/leaderboard"),
  });
}

// Друзі профілю: limit визначає, скільки перших друзів рахувати на бекенді
// (важкі запити), тож входить у ключ кешу. Скан довгий — тримаємо дані свіжими.
export function useFriends(limit: number) {
  return useQuery({
    queryKey: ["friends", limit] as const,
    queryFn: () => api.get<FriendsResponse>(`/api/friends?limit=${limit}`),
    staleTime: 5 * 60_000,
  });
}

export function usePlayer(steamId: string) {
  return useQuery({
    queryKey: ["player", steamId] as const,
    queryFn: () => api.get<PlayerProfile>(`/api/player/${steamId}`),
    enabled: steamId.length > 0,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => api.get<Notification[]>("/api/notifications"),
  });
}

// Без ids — позначає всі прочитаними; після успіху інвалідуємо список.
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      api.post<MarkNotificationsReadResponse>("/api/notifications/read", {
        ids,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.notifications });
    },
  });
}
