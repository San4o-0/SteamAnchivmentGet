import type { CSSProperties } from "react";
import type { Ach, RarityTier } from "@/api/types";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { cn } from "@/lib/format";

// Loot rarity accent per tier: colored left rail on the inventory slot.
const tierRail: Record<RarityTier, string> = {
  common: "border-l-common/60",
  uncommon: "border-l-uncommon",
  rare: "border-l-rare",
  epic: "border-l-epic",
  legendary: "border-l-gold",
  mythic: "border-l-mythic",
};

const tierIconRing: Record<RarityTier, string> = {
  common: "border-line",
  uncommon: "border-uncommon/50",
  rare: "border-rare/50",
  epic: "border-epic/50",
  legendary: "border-gold/60",
  mythic: "border-mythic/60",
};

export function AchievementRow({
  appId,
  ach,
  style,
}: {
  appId: number;
  ach: Ach;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        // RPG inventory slot: graphite panel with a rarity-colored left rail.
        // animate-rise + зовнішній animationDelay = стаггер-вхід списку.
        "panel panel-hover animate-rise flex items-center gap-4 border-l-2 p-3.5",
        tierRail[ach.rarityTier],
        ach.unlocked && "opacity-95",
        ach.rarityTier === "legendary" && "shadow-gold",
        ach.rarityTier === "mythic" && "shadow-mythic",
      )}
    >
      <div className="relative shrink-0">
        <img
          src={ach.icon}
          alt=""
          className={cn(
            // Square loot icon with a rarity ring.
            "h-12 w-12 rounded-md border bg-raised object-cover",
            ach.unlocked ? tierIconRing[ach.rarityTier] : "border-line/60 grayscale",
            ach.rarityTier === "legendary" && ach.unlocked && "shadow-gold",
            ach.rarityTier === "mythic" && ach.unlocked && "shadow-mythic",
          )}
        />
        {ach.unlocked && (
          // Claimed marker: done-green check stamped on the slot.
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-base bg-done text-base shadow-[0_0_10px_-2px_rgba(63,206,124,0.8)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className={cn("truncate font-display font-semibold", ach.unlocked ? "text-ink" : "text-ink/90")}>
            {ach.name}
          </h4>
          <RarityBadge tier={ach.rarityTier} globalPercent={ach.globalPercent} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{ach.desc}</p>
      </div>

      <div className="shrink-0">
        <UnlockButton appId={appId} ids={[ach.id]} unlocked={ach.unlocked} size="sm" />
      </div>
    </div>
  );
}
