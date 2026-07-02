import type { Ach } from "@/api/types";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

export type AchSortId =
  | "default"
  | "lockedFirst"
  | "unlockedFirst"
  | "rarest"
  | "common"
  | "name";

// null-safe доступ — бекенд може не заповнити частину полів (див. краш із lastPlayed).
const pct = (a: Ach) => a.globalPercent ?? 0;
const nameOf = (a: Ach) => a.name ?? "";

// cmp === null → лишаємо порядок від бекенду ("за замовчуванням").
export const ACH_SORTS: {
  id: AchSortId;
  labelKey: string;
  cmp: ((a: Ach, b: Ach) => number) | null;
}[] = [
  { id: "default", labelKey: "game.sortDefault", cmp: null },
  {
    id: "lockedFirst",
    labelKey: "game.sortLockedFirst",
    // Спочатку незібрані, всередині — найрідкісніші зверху.
    cmp: (a, b) => Number(a.unlocked) - Number(b.unlocked) || pct(a) - pct(b),
  },
  {
    id: "unlockedFirst",
    labelKey: "game.sortUnlockedFirst",
    cmp: (a, b) => Number(b.unlocked) - Number(a.unlocked) || pct(a) - pct(b),
  },
  { id: "rarest", labelKey: "game.sortRarest", cmp: (a, b) => pct(a) - pct(b) },
  { id: "common", labelKey: "game.sortCommon", cmp: (a, b) => pct(b) - pct(a) },
  {
    id: "name",
    labelKey: "game.sortName",
    cmp: (a, b) => nameOf(a).localeCompare(nameOf(b)),
  },
];

interface Props {
  value: AchSortId;
  onChange: (id: AchSortId) => void;
  className?: string;
}

export function AchievementSort({ value, onChange, className }: Props) {
  const t = useT();
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t("game.sortLabel")}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted"
      >
        {t("game.sortLabel")}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AchSortId)}
        className="appearance-none rounded-md border border-line/70 bg-surface/60 py-1.5 pl-[5.5rem] pr-9 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink transition-colors hover:border-accent/40 focus:border-accent/60 focus:shadow-glow focus:outline-none"
      >
        {ACH_SORTS.map((s) => (
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
