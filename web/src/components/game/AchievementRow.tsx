import type { CSSProperties } from "react";
import type { Ach, AgentProgressEntry, RarityTier } from "@/api/types";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

// Ціле показуємо без дробу (2 / 5), дробове — з одним знаком (12.5 / 20).
const fmtNum = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("uk-UA") : n.toFixed(1);

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
  progressGate,
}: {
  appId: number;
  ach: Ach;
  style?: CSSProperties;
  // Present when the agent reports this achievement as progress/stat-gated:
  // it can't be force-unlocked, so we show its goal and disable the button.
  progressGate?: AgentProgressEntry;
}) {
  const t = useT();
  const gated = !ach.unlocked && progressGate != null;
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

        {/* Стат-гейтована ачивка (агент не може виставити): показуємо ЦІЛЬ.
            Steam не віддає поточне значення, тож без «X/N» — лише «goal N». */}
        {gated && !ach.progress && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-accent">
            <span aria-hidden>🎯</span>
            {t("ach.goal")} {progressGate?.max}
          </div>
        )}

        {/* Прогрес накопичувальної ачивки: скільки з потрібного вже зроблено. */}
        {!ach.unlocked && ach.progress && ach.progress.target > 0 && (
          <div className="mt-2 flex items-center gap-2.5">
            <ProgressBar
              value={(ach.progress.current / ach.progress.target) * 100}
              className="flex-1"
            />
            <span className="shrink-0 font-mono text-[0.7rem] font-semibold tabular-nums text-accent">
              {fmtNum(ach.progress.current)} / {fmtNum(ach.progress.target)}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <UnlockButton
          appId={appId}
          ids={[ach.id]}
          unlocked={ach.unlocked}
          size="sm"
          disabledReason={gated ? t("unlock.progressReason") : undefined}
        />
      </div>
    </div>
  );
}
