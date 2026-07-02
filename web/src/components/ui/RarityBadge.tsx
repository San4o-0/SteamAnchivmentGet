import type { RarityTier } from "@/api/types";
import { cn, formatGlobalPercent, rarityLabel } from "@/lib/format";

interface Props {
  tier: RarityTier;
  globalPercent: number;
  size?: "sm" | "md";
}

const styles: Record<RarityTier, string> = {
  common: "border-common/30 bg-common/10 text-common",
  rare: "border-rare/40 bg-rare/10 text-rare",
  ultra: "border-gold/50 bg-gold/10 text-gold shadow-gold",
};

export function RarityBadge({ tier, globalPercent, size = "md" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono font-medium uppercase tracking-wider",
        size === "sm" ? "px-1.5 py-0.5 text-[0.6rem]" : "px-2 py-1 text-[0.68rem]",
        styles[tier],
      )}
      title={`${rarityLabel[tier]} · ${formatGlobalPercent(globalPercent)} гравців`}
    >
      {tier === "ultra" && <span aria-hidden>★</span>}
      {rarityLabel[tier]}
      <span className="opacity-70">{formatGlobalPercent(globalPercent)}</span>
    </span>
  );
}
