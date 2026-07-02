import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type {
  AgentHealth,
  GameDetail,
  LibraryEntry,
  Me,
  Roadmap,
  UnlockResponse,
} from "./types";

export const keys = {
  me: ["me"] as const,
  library: ["library"] as const,
  game: (appId: number) => ["game", appId] as const,
  roadmap: (appId: number) => ["roadmap", appId] as const,
  health: ["health"] as const,
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
