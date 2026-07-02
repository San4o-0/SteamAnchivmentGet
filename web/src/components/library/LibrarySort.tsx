import type { LibraryEntry } from "@/api/types";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

export type SortId =
  | "closest"
  | "leastRemaining"
  | "mostAch"
  | "leastAch"
  | "recent"
  | "hours"
  | "rarity"
  | "name";

// Кожен режим — компаратор із фокусом на досягненнях. `remaining` = скільки
// ачивок ще не зібрано; завершені (0 залишку) опускаємо в кінець для тих
// режимів, де це має сенс.
const remaining = (g: LibraryEntry) => g.achTotal - g.achDone;

// Реальний бекенд може віддати lastPlayed як undefined/невалідний рядок —
// парсимо безпечно, щоб localeCompare/Date не крашили рендер.
const playedAt = (g: LibraryEntry) => {
  const ts = g.lastPlayed ? Date.parse(g.lastPlayed) : NaN;
  return Number.isNaN(ts) ? 0 : ts;
};
const nameOf = (g: LibraryEntry) => g.name ?? "";

export const SORTS: { id: SortId; labelKey: string; cmp: (a: LibraryEntry, b: LibraryEntry) => number }[] = [
  {
    id: "closest",
    labelKey: "lib.sortClosest",
    // Незавершені, найвищий % зверху; завершені — в кінець.
    cmp: (a, b) =>
      Number(remaining(a) === 0) - Number(remaining(b) === 0) ||
      b.completion - a.completion,
  },
  {
    id: "leastRemaining",
    labelKey: "lib.sortLeastRemaining",
    cmp: (a, b) =>
      Number(remaining(a) === 0) - Number(remaining(b) === 0) ||
      remaining(a) - remaining(b) ||
      b.completion - a.completion,
  },
  { id: "mostAch", labelKey: "lib.sortMostAch", cmp: (a, b) => b.achTotal - a.achTotal },
  { id: "leastAch", labelKey: "lib.sortLeastAch", cmp: (a, b) => a.achTotal - b.achTotal },
  {
    id: "recent",
    labelKey: "lib.sortRecent",
    cmp: (a, b) => playedAt(b) - playedAt(a),
  },
  { id: "hours", labelKey: "lib.sortHours", cmp: (a, b) => (b.hours ?? 0) - (a.hours ?? 0) },
  { id: "rarity", labelKey: "lib.sortRarity", cmp: (a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) },
  {
    id: "name",
    labelKey: "lib.sortName",
    cmp: (a, b) => nameOf(a).localeCompare(nameOf(b)),
  },
];

interface Props {
  value: SortId;
  onChange: (id: SortId) => void;
  className?: string;
}

export function LibrarySort({ value, onChange, className }: Props) {
  const t = useT();
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t("lib.sortLabel")}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted"
      >
        {t("lib.sortLabel")}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortId)}
        className="appearance-none rounded-md border border-line/70 bg-surface/60 py-2 pl-[5.5rem] pr-9 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink transition-colors hover:border-accent/40 focus:border-accent/60 focus:shadow-glow focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id} className="bg-surface text-ink">
            {t(s.labelKey)}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 text-muted"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
