import type { ReactNode } from "react";
import { cn } from "@/lib/format";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "accent" | "gold" | "done";
  className?: string;
}

const accentClass = {
  accent: "text-accent",
  gold: "text-gold",
  done: "text-done",
} as const;

export function StatTile({ label, value, hint, accent = "accent", className }: Props) {
  return (
    <div
      className={cn(
        "panel relative overflow-hidden p-5",
        "before:absolute before:left-0 before:top-0 before:h-8 before:w-[3px] before:content-['']",
        accent === "gold"
          ? "before:bg-gold"
          : accent === "done"
            ? "before:bg-done"
            : "before:bg-accent",
        className,
      )}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "mt-2 font-display text-4xl font-bold tabular-nums leading-none",
          accentClass[accent],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}
