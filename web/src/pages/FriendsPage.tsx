import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFriends } from "@/api/hooks";
import type { FriendCard } from "@/api/types";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPercent } from "@/lib/format";
import { useT, type TFn } from "@/lib/i18n";

// Скільки перших друзів рахувати (входить у запит до бекенда — важкий скан).
const LIMITS = [6, 12, 24, 50];

type SortId =
  | "level"
  | "achievements"
  | "rarity"
  | "perfect"
  | "games"
  | "name"
  | "friendSince";

const SORTS: { id: SortId; key: string; cmp: (a: FriendCard, b: FriendCard) => number }[] = [
  { id: "level", key: "friends.sortLevel", cmp: (a, b) => b.level - a.level },
  { id: "achievements", key: "friends.sortAch", cmp: (a, b) => b.achievements - a.achievements },
  { id: "rarity", key: "friends.sortRarity", cmp: (a, b) => b.rarityScore - a.rarityScore },
  { id: "perfect", key: "friends.sortPerfect", cmp: (a, b) => b.perfectGames - a.perfectGames },
  { id: "games", key: "friends.sortGames", cmp: (a, b) => b.games - a.games },
  { id: "name", key: "friends.sortName", cmp: (a, b) => (a.name ?? "").localeCompare(b.name ?? "") },
  { id: "friendSince", key: "friends.sortSince", cmp: (a, b) => a.friendSince - b.friendSince },
];

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <div className="text-center">
      <div className={`font-display text-lg font-bold tabular-nums leading-none ${accent ?? "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[0.55rem] uppercase tracking-wider text-muted">
        {label}
      </div>
    </div>
  );
}

function FriendTile({ f, t, i }: { f: FriendCard; t: TFn; i: number }) {
  return (
    <Link
      to={`/player/${f.steamId}`}
      className="panel panel-hover animate-rise group flex flex-col gap-4 p-4"
      style={{ animationDelay: `${Math.min(i, 16) * 40}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={f.avatar}
            alt=""
            className="h-14 w-14 rounded-xl border border-line bg-raised object-cover transition-colors group-hover:border-accent/60"
          />
          {/* Бейдж рівня Steam у кутку аватара. */}
          <span className="absolute -bottom-1.5 -right-1.5 grid min-w-[1.4rem] place-items-center rounded-md border border-accent/50 bg-base px-1 py-0.5 font-mono text-[0.62rem] font-bold tabular-nums text-accent shadow-glow">
            {f.level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-semibold tracking-tight transition-colors group-hover:text-accent">
            {f.name}
          </div>
          <div className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
            {t("friends.level")} {f.level} · {f.games} {t("dash.games")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-line/50 pt-3">
        <Stat value={f.achievements.toLocaleString("uk-UA")} label={t("friends.ach")} accent="text-done" />
        <Stat value={f.perfectGames} label={t("friends.perfect")} accent="text-gold" />
        <Stat value={Math.round(f.rarityScore)} label={t("dash.rarityScore")} accent="text-accent" />
        <Stat value={formatPercent(f.avgCompletion)} label={t("friends.avg")} />
      </div>
    </Link>
  );
}

export function FriendsPage() {
  const t = useT();
  const [limit, setLimit] = useState(12);
  const [sort, setSort] = useState<SortId>("level");
  const { data, isLoading, isError, refetch, isFetching } = useFriends(limit);

  const sorted = useMemo(() => {
    if (!data) return [];
    const cmp = SORTS.find((s) => s.id === sort)?.cmp;
    return cmp ? [...data.friends].sort(cmp) : data.friends;
  }, [data, sort]);

  return (
    <div className="animate-rise space-y-6">
      <header className="rounded-xl border border-line/70 bg-surface/40 p-5 backdrop-blur-sm sm:p-6">
        <div className="eyebrow text-accent">{t("friends.eyebrow")}</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("friends.title")}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t("friends.subtitle")}
        </p>
      </header>

      {/* Керування: скільки друзів рахувати + за чим сортувати. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select<string>
          label={t("friends.showLabel")}
          value={String(limit)}
          onChange={(v) => setLimit(Number(v))}
          options={LIMITS.map((n) => ({ id: String(n), label: `${n}` }))}
        />
        <Select<SortId>
          label={t("friends.sortLabel")}
          value={sort}
          onChange={setSort}
          options={SORTS.map((s) => ({ id: s.id, label: t(s.key) }))}
        />
      </div>

      {isLoading ? (
        <PageLoader label={t("friends.loading")} />
      ) : isError || !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.private || sorted.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted">
          {t("friends.private")}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-wider text-muted">
            <span>
              {sorted.length} / {data.total} {t("friends.countSuffix")}
            </span>
            {isFetching && <span className="text-accent">{t("common.loadingEllipsis")}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((f, i) => (
              <FriendTile key={f.steamId} f={f} t={t} i={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
