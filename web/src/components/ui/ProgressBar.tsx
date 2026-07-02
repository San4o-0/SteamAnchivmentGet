import { cn } from "@/lib/format";

interface Props {
  value: number; // 0–100
  className?: string;
  tone?: "accent" | "gold" | "done";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  accent: "from-accent-dim to-accent",
  gold: "from-[#a8802a] to-gold",
  done: "from-[#2f7a4d] to-done",
};

export function ProgressBar({ value, className, tone = "accent" }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 100 ? "done" : tone;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line/60", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
          toneClass[auto],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
