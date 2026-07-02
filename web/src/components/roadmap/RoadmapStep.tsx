import type { CSSProperties } from "react";
import type { RoadmapStep as Step } from "@/api/types";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { cn, formatEta } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface Props {
  appId: number;
  step: Step;
  isHardest: boolean;
  style?: CSSProperties;
}

// Rarity-tinted glow border for the inventory-slot card — the loot tier
// bleeds a faint aura, LEGENDARY glows gold, MYTHIC magenta (strongest).
const rarityRing: Record<string, string> = {
  common: "border-line/80",
  uncommon: "border-uncommon/40",
  rare: "border-rare/40 shadow-[0_0_22px_-8px_rgba(76,141,255,0.6)]",
  epic: "border-epic/45 shadow-[0_0_22px_-8px_rgba(168,85,247,0.6)]",
  legendary: "border-gold/55 shadow-gold",
  mythic: "border-mythic/55 shadow-mythic",
};

export function RoadmapStep({ appId, step, isHardest, style }: Props) {
  const t = useT();
  const { ach } = step;
  const done = ach.unlocked;
  const mythic = ach.rarityTier === "mythic";
  // Топ-дроп: legendary/mythic тір або найважча ачивка маршруту.
  const topDrop = mythic || ach.rarityTier === "legendary" || isHardest;

  return (
    <li className="animate-rise relative pb-4 pl-14" style={style}>
      {/* Quest node on the violet line */}
      <span
        className={cn(
          "absolute left-[14px] top-4 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 font-mono text-[0.62rem] font-bold tabular-nums",
          done
            ? "border-done bg-done/15 text-done"
            : mythic
              ? "border-mythic bg-mythic/15 text-mythic shadow-mythic"
              : topDrop
                ? "glow-gold border-gold bg-gold/15 text-gold shadow-gold"
                : // Фіолетові вузли дихають ледь помітно й повільніше за топ-дропи.
                  "glow-node border-accent bg-base text-accent shadow-node",
        )}
      >
        {done ? "✓" : step.order}
      </span>

      <div
        className={cn(
          "panel flex items-center gap-4 p-4 transition-colors",
          rarityRing[ach.rarityTier] ?? "border-line/80",
          topDrop &&
            !done &&
            (mythic
              ? "bg-gradient-to-r from-mythic/[0.06] to-transparent"
              : "bg-gradient-to-r from-gold/[0.06] to-transparent"),
          done && "opacity-70",
        )}
      >
        {/* Inventory slot: icon framed like an equipped item */}
        <div
          className={cn(
            "relative shrink-0 rounded-lg border p-0.5",
            mythic ? "border-mythic/40" : topDrop ? "border-gold/40" : "border-line",
          )}
        >
          <span className="eyebrow absolute -top-2 left-1 z-10 bg-surface px-1 text-[0.55rem] text-muted">
            #{step.order}
          </span>
          <img
            src={ach.icon}
            alt=""
            className={cn(
              "h-12 w-12 rounded-md bg-raised",
              !done && "grayscale",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display font-semibold text-ink">{ach.name}</h4>
            {isHardest && (
              <span
                className="font-mono text-[0.62rem] uppercase tracking-wider text-gold"
                title={t("road.hardestTitle")}
              >
                ★ {t("road.hardest")}
              </span>
            )}
            <RarityBadge tier={ach.rarityTier} globalPercent={ach.globalPercent} size="sm" />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{ach.desc}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded border border-line bg-raised/60 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-muted">
            ETA ≈ <span className="text-ink/90">{formatEta(step.etaMinutes)}</span>
          </span>
        </div>

        <div className="shrink-0">
          <UnlockButton appId={appId} ids={[ach.id]} unlocked={done} size="sm" />
        </div>
      </div>
    </li>
  );
}
