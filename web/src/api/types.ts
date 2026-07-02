// Дзеркало SHARED CONTRACT — не відхилятись, бекенд (Потік 1) віддає рівно це.

export type RarityTier =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";
export type RoadmapGroup = "start" | "mid" | "end";

// Прогрес прогресової/накопичувальної ачивки (напр. «Вбий 5 ведмедів» -> 2/5).
// Присутній лише коли джерело (локальний агент) його віддає; інакше null.
export interface AchProgress {
  current: number;
  target: number;
}

export interface Ach {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  globalPercent: number;
  rarityTier: RarityTier;
  progress?: AchProgress | null;
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

// --- Feature expansion (дзеркало FEATURE_SPEC.md) ---

export interface StatsTotals {
  games: number;
  achievements: number;
  perfectGames: number;
  avgCompletion: number;
  rarityScore: number;
}

export interface RarityCounts {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  mythic: number;
}

export interface CompletionBucket {
  label: string;
  count: number;
}

export interface TopRareUnlock {
  gameName: string;
  appId: number;
  ach: Ach;
}

export interface TopGame {
  appId: number;
  name: string;
  cover: string;
  completion: number;
  achDone: number;
  achTotal: number;
}

export interface Stats {
  totals: StatsTotals;
  rarity: RarityCounts; // кількість РОЗБЛОКОВАНИХ ачивок за тіром
  completionBuckets: CompletionBucket[];
  topRareUnlocks: TopRareUnlock[]; // найрідкісніші розблоковані, до 6
  topGames: TopGame[]; // найближчі до 100%, до 6
}

// Публічний профіль іншого гравця (клік у Лізі).
export interface PlayerProfile {
  steamId: string;
  name: string;
  avatar: string;
  stats: Stats;
}

export type SettingsLanguage = "uk" | "en";
export type SettingsTheme = "dark" | "light";
export type SettingsAccent = "violet" | "blue" | "green" | "gold" | "magenta";
export type SettingsBackground =
  | "cosmos"
  | "aurora"
  | "rain"
  | "grid"
  | "fireflies"
  | "off";

export interface Settings {
  agentUrl: string;
  language: SettingsLanguage;
  theme: SettingsTheme;
  accent: SettingsAccent;
  background: SettingsBackground;
  privateProfile: boolean;
  autoRoadmap: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  steamId: string;
  name: string;
  avatar: string;
  rarityScore: number;
  achievements: number;
  perfectGames: number;
  isMe: boolean; // рівно один true — поточний користувач
}

export interface FriendCard {
  steamId: string;
  name: string;
  avatar: string;
  level: number;
  games: number;
  achievements: number;
  perfectGames: number;
  rarityScore: number;
  avgCompletion: number;
  friendSince: number; // unix ts (0 = невідомо)
}

export interface FriendsResponse {
  total: number; // усього друзів у профілі
  limit: number; // скільки порахували
  private: boolean; // список друзів приватний / порожній
  friends: FriendCard[];
}

export type NotificationType =
  | "unlock"
  | "rare"
  | "roadmap"
  | "system"
  | "almost"
  | "milestone";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  gameName?: string;
  appId?: number;
  read: boolean;
  createdAt: string; // ISO 8601
}

export interface MarkNotificationsReadRequest {
  ids?: string[]; // без ids => позначити всі прочитаними
}

export interface MarkNotificationsReadResponse {
  ok: boolean;
  unread: number;
}
