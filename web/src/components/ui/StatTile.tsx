import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/format";
import { useCountUp } from "@/lib/motion";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "accent" | "gold" | "done";
  className?: string;
  style?: CSSProperties;
}

const accentClass = {
  accent: "text-accent",
  gold: "text-gold",
  done: "text-done",
} as const;

// Rarity-tinted sheen that runs the top edge of the HUD readout.
const sheenClass = {
  accent: "via-accent",
  gold: "via-gold",
  done: "via-done",
} as const;

export function StatTile({ label, value, hint, accent = "accent", className, style }: Props) {
  // Числові значення «набігають» до цілі; будь-який інший ReactNode
  // (рядки з локаллю, "—") рендериться як є.
  const numeric = typeof value === "number" && Number.isFinite(value);
  const count = useCountUp(numeric ? (value as number) : 0);
  return (
    <div
      className={cn(
        // HUD stat readout: graphite panel, crisp cool border, faint top sheen.
        // Legendary (gold) tier earns a subtle loot glow.
        // `group` + `panel-hover` make it lift and sweep a light band on hover.
        "panel panel-hover group relative overflow-hidden p-5",
        accent === "gold" && "shadow-gold",
        className,
      )}
      style={style}
    >
      {/* Diagonal light band that sweeps across on hover. */}
      <span aria-hidden className="sheen-sweep" />
      {/* Rarity sheen across the top edge, fading at both ends. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          sheenClass[accent],
        )}
      />
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "mt-3 font-display text-[2.6rem] font-semibold tabular-nums leading-none tracking-tight",
          accentClass[accent],
        )}
      >
        {numeric ? Math.round(count) : value}
      </div>
      {hint && <div className="mt-2.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
