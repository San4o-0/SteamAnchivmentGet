import type { RarityTier } from "@/api/types";
import { cn, formatGlobalPercent, rarityLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface Props {
  tier: RarityTier;
  globalPercent: number;
  size?: "sm" | "md";
}

// Inventory-slot rarity chip: a sharp loot tag with an inset edge, colored
// by loot tier — LEGENDARY glows gold, MYTHIC burns magenta (strongest aura).
const styles: Record<RarityTier, string> = {
  common:
    "border-common/30 bg-common/10 text-common shadow-[inset_0_0_0_1px_rgba(154,160,166,0.18)]",
  uncommon:
    "border-uncommon/45 bg-uncommon/10 text-uncommon shadow-[inset_0_0_0_1px_rgba(87,201,107,0.22)]",
  rare: "border-rare/50 bg-rare/12 text-rare shadow-[inset_0_0_0_1px_rgba(76,141,255,0.25)]",
  epic: "border-epic/50 bg-epic/12 text-epic shadow-[inset_0_0_0_1px_rgba(168,85,247,0.28)]",
  legendary: "border-gold/60 bg-gold/12 text-gold shadow-gold",
  mythic: "border-mythic/60 bg-mythic/12 text-mythic shadow-mythic",
};

export function RarityBadge({ tier, globalPercent, size = "md" }: Props) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono font-semibold uppercase tracking-[0.12em]",
        size === "sm" ? "px-2 py-0.5 text-[0.6rem]" : "px-2.5 py-1 text-[0.68rem]",
        styles[tier],
      )}
      title={`${rarityLabel[tier]} · ${formatGlobalPercent(globalPercent)} ${t("common.players")}`}
    >
      {tier === "legendary" && <span aria-hidden>✦</span>}
      {tier === "mythic" && <span aria-hidden>✸</span>}
      {rarityLabel[tier]}
      <span className="font-display text-[0.85em] not-italic opacity-80">
        {formatGlobalPercent(globalPercent)}
      </span>
    </span>
  );
}
