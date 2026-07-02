import type { RarityTier } from "@/api/types";
import { getLang } from "@/lib/appearance";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Мовно-залежні короткі одиниці. Читаємо мову в момент виклику — компоненти,
// що споживають i18n-контекст, перемальовуються при зміні мови й перераховують це.
function units() {
  return getLang() === "en" ? { h: "h", m: "m" } : { h: "год", m: "хв" };
}

export function formatHours(hours: number): string {
  const u = units();
  if (hours < 1) return `${Math.round(hours * 60)} ${u.m}`;
  return `${hours} ${u.h}`;
}

export function formatEta(minutes: number): string {
  const u = units();
  if (minutes < 60) return `${minutes} ${u.m}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ${u.h}` : `${h} ${u.h} ${m} ${u.m}`;
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(getLang() === "en" ? "en-US" : "uk-UA", {
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
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

export const rarityColor: Record<RarityTier, string> = {
  common: "text-common",
  uncommon: "text-uncommon",
  rare: "text-rare",
  epic: "text-epic",
  legendary: "text-gold",
  mythic: "text-mythic",
};
