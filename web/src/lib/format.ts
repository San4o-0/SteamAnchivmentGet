import type { RarityTier } from "@/api/types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} хв`;
  return `${hours} год`;
}

export function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} год` : `${h} год ${m} хв`;
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

// One decimal for the sub-5% rarities where precision reads as prestige.
export function formatGlobalPercent(n: number): string {
  return n < 10 ? `${n.toFixed(1)}%` : `${Math.round(n)}%`;
}

export const rarityLabel: Record<RarityTier, string> = {
  common: "Common",
  rare: "Rare",
  ultra: "Ultra Rare",
};

export const rarityColor: Record<RarityTier, string> = {
  common: "text-common",
  rare: "text-rare",
  ultra: "text-gold",
};
