import type { LibraryEntry } from "@/api/types";
import { Select } from "@/components/ui/Select";
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
    <Select<SortId>
      label={t("lib.sortLabel")}
      value={value}
      onChange={onChange}
      options={SORTS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
      className={className}
    />
  );
}
