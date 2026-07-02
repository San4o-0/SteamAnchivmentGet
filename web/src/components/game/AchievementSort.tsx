import type { Ach } from "@/api/types";
import { Select } from "@/components/ui/Select";
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
    <Select<AchSortId>
      label={t("game.sortLabel")}
      value={value}
      onChange={onChange}
      options={ACH_SORTS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
      className={className}
      dense
    />
  );
}
