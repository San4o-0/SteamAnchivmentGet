import { cn } from "@/lib/format";
import { useMounted } from "@/lib/motion";

interface Props {
  value: number; // 0–100
  className?: string;
  tone?: "accent" | "gold" | "done";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  accent: "from-accent-dim to-accent shadow-[0_0_8px_rgba(139,92,246,0.5)]",
  gold: "from-accent-dim to-gold shadow-[0_0_8px_rgba(245,166,35,0.45)]",
  done: "from-[#2e5b2c] to-done shadow-[0_0_8px_rgba(74,157,72,0.45)]",
};

export function ProgressBar({ value, className, tone = "accent" }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 100 ? "done" : tone;
  // Заповнення анімується від 0 після монтування (наявний width-transition);
  // при reduced-motion useMounted → true одразу, бар статичний і повний.
  const mounted = useMounted();
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line/50", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "relative h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
          toneClass[auto],
        )}
        style={{ width: `${mounted ? pct : 0}%` }}
      >
        {pct > 0 && pct < 100 && (
          <span aria-hidden className="progress-sheen rounded-full" />
        )}
      </div>
    </div>
  );
}
