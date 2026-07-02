import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

export type FilterId = "all" | "unfinished" | "completed" | "under10h";

export const FILTERS: { id: FilterId; labelKey: string }[] = [
  { id: "all", labelKey: "lib.filterAll" },
  { id: "unfinished", labelKey: "lib.filterUnfinished" },
  { id: "completed", labelKey: "lib.filterCompleted" },
  { id: "under10h", labelKey: "lib.filterUnder10h" },
];

interface Props {
  active: FilterId;
  onChange: (id: FilterId) => void;
  counts: Record<FilterId, number>;
}

export function LibraryFilters({ active, onChange, counts }: Props) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("lib.filtersLabel")}>
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f.id)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3.5 py-2 font-mono text-[0.72rem] uppercase tracking-[0.12em] transition-all",
              isActive
                ? "border-accent bg-accent text-base shadow-glow"
                : "border-line/70 bg-surface/50 text-muted hover:border-accent/40 hover:text-ink",
            )}
          >
            {t(f.labelKey)}
            <span
              className={cn(
                "rounded text-[0.66rem] tabular-nums",
                isActive ? "text-base/70" : "text-muted/60",
              )}
            >
              {counts[f.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
