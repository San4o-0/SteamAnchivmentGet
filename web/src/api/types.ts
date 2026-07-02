// Дзеркало SHARED CONTRACT — не відхилятись, бекенд (Потік 1) віддає рівно це.

export type RarityTier = "common" | "rare" | "ultra";
export type RoadmapGroup = "start" | "mid" | "end";

export interface Ach {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  globalPercent: number;
  rarityTier: RarityTier;
}

export interface MeStats {
  games: number;
  achievements: number;
  avgCompletion: number;
  rarityScore: number;
}

export interface Me {
  steamId: string;
  name: string;
  avatar: string;
  stats: MeStats;
}

export interface LibraryEntry {
  appId: number;
  name: string;
  cover: string;
  completion: number;
  hours: number;
  achDone: number;
  achTotal: number;
  rarity: number;
  lastPlayed: string;
}

export interface GameDetail {
  appId: number;
  name: string;
  completion: number;
  estHoursTo100: number;
  achievements: Ach[];
  difficulty: number;
}

export interface RoadmapStep {
  order: number;
  group: RoadmapGroup;
  ach: Ach;
  etaMinutes: number;
}

export interface Roadmap {
  steps: RoadmapStep[];
}

export interface UnlockRequest {
  ids: string[];
}

export interface UnlockResult {
  id: string;
  ok: boolean;
}

export interface UnlockResponse {
  ok: boolean;
  results: UnlockResult[];
  error?: string;
}

export interface AgentHealth {
  steamRunning: boolean;
  version: string;
}

export interface TokenResponse {
  token: string;
  steamId: string;
}
