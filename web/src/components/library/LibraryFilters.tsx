import { cn } from "@/lib/format";

export type FilterId = "all" | "unfinished" | "under10h" | "easiest";

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Усі" },
  { id: "unfinished", label: "Тільки незавершені" },
  { id: "under10h", label: "До 10 годин" },
  { id: "easiest", label: "Найпростіші до 100%" },
];

interface Props {
  active: FilterId;
  onChange: (id: FilterId) => void;
  counts: Record<FilterId, number>;
}

export function LibraryFilters({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Фільтри бібліотеки">
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-line/70 bg-surface/50 text-muted hover:border-line hover:text-ink",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded font-mono text-[0.65rem] tabular-nums",
                isActive ? "text-accent/80" : "text-muted/70",
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
