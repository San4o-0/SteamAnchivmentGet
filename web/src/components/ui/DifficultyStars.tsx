import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface Props {
  value: number; // 1–5
  className?: string;
}

export function DifficultyStars({ value, className }: Props) {
  const t = useT();
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${t("common.difficulty")} ${full} ${t("common.outOf5")}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "text-sm leading-none transition-colors",
            i < full ? "text-accent drop-shadow-[0_0_3px_rgba(139,92,246,0.6)]" : "text-line",
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}
