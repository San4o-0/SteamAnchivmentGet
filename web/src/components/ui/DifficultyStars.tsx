import { cn } from "@/lib/format";

interface Props {
  value: number; // 1–5
  className?: string;
}

export function DifficultyStars({ value, className }: Props) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Складність ${full} з 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "text-sm leading-none",
            i < full ? "text-gold" : "text-line",
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}
