import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "./client";
import { getToken } from "@/lib/auth";
import type {
  AgentHealth,
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
  UnlockResponse,
} from "./types";

export const keys = {
  me: ["me"] as const,
  library: ["library"] as const,
  game: (appId: number) => ["game", appId] as const,
  roadmap: (appId: number) => ["roadmap", appId] as const,
  health: ["health"] as const,
  stats: ["stats"] as const,
  settings: ["settings"] as const,
  leaderboard: ["leaderboard"] as const,
  notifications: ["notifications"] as const,
};

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

// api-клієнт (client.ts) віддає лише get/post — для PUT /api/settings
// робимо самодостатній запит із тими самими заголовками/семантикою помилок.
async function putJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return (await res.json()) as T;
}

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
    queryFn: () => api.get<GameDetail>(`/api/game/${appId}`),
    enabled: Number.isFinite(appId),
  });
}

export function useRoadmap(appId: number) {
  return useQuery({
    queryKey: keys.roadmap(appId),
    queryFn: () => api.get<Roadmap>(`/api/game/${appId}/roadmap`),
    enabled: Number.isFinite(appId),
  });
}

// Помилка = агент офлайн (показуємо банером), не блокує решту UI.
export function useAgentHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: () => api.get<AgentHealth>("/api/agent/health"),
    refetchInterval: 15_000,
    retry: false,
    staleTime: 10_000,
  });
}

// Після unlock інвалідуємо game/roadmap/library/me, щоб UI відразу оновився.
export function useUnlock(appId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<UnlockResponse>(`/api/game/${appId}/unlock`, { ids }),
    onSuccess: () => {
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
      putJson<Settings>("/api/settings", settings),
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
