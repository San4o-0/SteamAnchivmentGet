import { Link } from "react-router-dom";
import { useLeaderboard } from "@/api/hooks";
import type { LeaderboardEntry } from "@/api/types";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/format";
import { useT, type TFn } from "@/lib/i18n";
import { useMemo, useState, type CSSProperties } from "react";

// Метрики, за якими можна ранжувати лігу. Сортування — на клієнті (набір малий),
// ранг перераховується за обраною метрикою.
type LeaderMetric = "rarity" | "achievements" | "perfect";

const METRIC_CMP: Record<
  LeaderMetric,
  (a: LeaderboardEntry, b: LeaderboardEntry) => number
> = {
  rarity: (a, b) =>
    b.rarityScore - a.rarityScore || b.achievements - a.achievements,
  achievements: (a, b) =>
    b.achievements - a.achievements || b.rarityScore - a.rarityScore,
  perfect: (a, b) =>
    b.perfectGames - a.perfectGames || b.rarityScore - a.rarityScore,
};

const METRIC_SORT_KEY: Record<LeaderMetric, string> = {
  rarity: "leader.sortRarity",
  achievements: "leader.sortAchievements",
  perfect: "leader.sortPerfect",
};

// Головне число картки/п'єдесталу залежить від активної метрики.
function heroFor(metric: LeaderMetric, e: LeaderboardEntry, t: TFn) {
  if (metric === "achievements")
    return { value: e.achievements, label: t("leader.achievementsLabel") };
  if (metric === "perfect")
    return { value: e.perfectGames, label: t("leader.perfectLabel") };
  return { value: e.rarityScore, label: t("leader.rarityScore") };
}

// Порядок появи п'єдесталу: срібло → золото → бронза (2 → 1 → 3).
const podiumDelay: Record<number, number> = { 2: 0, 1: 90, 3: 180 };

// Оформлення п'єдесталу за тірами лута: 1 = legendary gold, 2 = rare blue, 3 = common/bronze.
const podiumTiers: Record<
  number,
  { label: string; ring: string; score: string; badge: string; glow?: string }
> = {
  1: {
    label: "Legendary",
    ring: "ring-gold",
    score: "text-gold",
    badge: "border-gold/50 bg-gold/10 text-gold",
    glow: "shadow-gold",
  },
  2: {
    label: "Rare",
    ring: "ring-rare",
    score: "text-rare",
    badge: "border-rare/50 bg-rare/10 text-rare",
  },
  3: {
    label: "Common",
    ring: "ring-common",
    score: "text-common",
    badge: "border-common/50 bg-common/10 text-common",
  },
};

function MeTag() {
  const t = useT();
  return (
    <span className="rounded border border-accent/60 bg-accent/20 px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-accent">
      {t("leader.you")}
    </span>
  );
}

function PodiumCard({
  entry,
  metric,
}: {
  entry: LeaderboardEntry;
  metric: LeaderMetric;
}) {
  const t = useT();
  const tier = podiumTiers[entry.rank] ?? podiumTiers[3];
  const first = entry.rank === 1;
  const hero = heroFor(metric, entry, t);
  // Підрядок — дві НЕактивні метрики, з'єднані через « · » (без активної).
  const others: string[] = [];
  if (metric !== "rarity")
    others.push(`${entry.rarityScore.toLocaleString("uk-UA")} RS`);
  if (metric !== "achievements")
    others.push(
      `${entry.achievements.toLocaleString("uk-UA")} ${t("leader.achievements")}`,
    );
  if (metric !== "perfect") others.push(`${entry.perfectGames} perfect`);

  return (
    <Link
      to={`/player/${entry.steamId}`}
      // Вхід у порядку 2 → 1 → 3; підвищене 1-ше місце входить лише
      // прозорістю (animate-fade), щоб не збивати свій -translate-y.
      style={{ animationDelay: `${podiumDelay[entry.rank] ?? 180}ms` }}
      className={cn(
        "panel relative flex flex-col items-center gap-3 p-6 text-center transition-colors hover:border-accent/60",
        first ? "animate-fade" : "animate-rise",
        // 2 | 1 | 3 на широких екранах, центр підвищений; на мобільних — 1, 2, 3.
        first
          ? "order-1 sm:order-2 sm:-translate-y-4"
          : entry.rank === 2
            ? "order-2 sm:order-1"
            : "order-3",
        first && tier.glow,
        entry.isMe && "border-accent bg-accent/10 shadow-glow",
      )}
    >
      {first && (
        <span
          aria-hidden
          className="absolute -top-3 font-display text-xl text-gold drop-shadow-[0_0_6px_rgba(245,166,35,0.8)]"
        >
          ✦
        </span>
      )}

      <span
        className={cn(
          "rounded border px-2 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-widest",
          tier.badge,
        )}
      >
        #{entry.rank} · {tier.label}
      </span>

      <img
        src={entry.avatar}
        alt=""
        className={cn(
          "rounded-xl bg-raised object-cover ring-2 ring-offset-2 ring-offset-base",
          tier.ring,
          first ? "h-20 w-20" : "h-16 w-16",
          first && "shadow-gold",
        )}
      />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-sm text-ink">{entry.name}</span>
        {entry.isMe && <MeTag />}
      </div>

      <div>
        <div
          className={cn(
            "font-display font-bold tabular-nums tracking-tight",
            first ? "text-4xl" : "text-3xl",
            tier.score,
          )}
        >
          {hero.value.toLocaleString("uk-UA")}
        </div>
        <div className="eyebrow mt-1">{hero.label}</div>
      </div>

      <div className="font-mono text-[0.68rem] uppercase tracking-wider text-muted">
        {others.join(" · ")}
      </div>
    </Link>
  );
}

function LadderRow({
  entry,
  style,
}: {
  entry: LeaderboardEntry;
  style?: CSSProperties;
}) {
  const t = useT();
  return (
    <li style={style} className="animate-rise">
      <Link
        to={`/player/${entry.steamId}`}
        className={cn(
          "panel flex items-center gap-4 px-4 py-3 transition-colors hover:border-accent/60",
          entry.isMe && "border-accent bg-accent/10 shadow-glow",
        )}
      >
        <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-muted">
          {entry.rank}
        </span>

      <img
        src={entry.avatar}
        alt=""
        className={cn(
          "h-9 w-9 shrink-0 rounded-lg border border-line bg-raised object-cover",
          entry.isMe && "border-accent/60",
        )}
      />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-mono text-sm text-ink">{entry.name}</span>
        {entry.isMe && <MeTag />}
      </div>

      <div className="hidden w-20 shrink-0 text-right sm:block">
        <div className="font-mono text-sm tabular-nums text-ink">
          {entry.achievements.toLocaleString("uk-UA")}
        </div>
        <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">
          {t("leader.achievementsLabel")}
        </div>
      </div>

      <div className="hidden w-16 shrink-0 text-right sm:block">
        <div className="font-mono text-sm tabular-nums text-done">
          {entry.perfectGames}
        </div>
        <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">
          Perfect
        </div>
      </div>

        <div className="w-24 shrink-0 text-right">
          <div className="font-display text-lg font-bold tabular-nums text-accent">
            {entry.rarityScore.toLocaleString("uk-UA")}
          </div>
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">
            Rarity Score
          </div>
        </div>
      </Link>
    </li>
  );
}

export function LeaderboardPage() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useLeaderboard();
  const [metric, setMetric] = useState<LeaderMetric>("rarity");

  // Пересортовуємо за обраною метрикою й перераховуємо ранг (набір малий).
  const ranked = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort(METRIC_CMP[metric])
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [data, metric]);

  if (isLoading) return <PageLoader label={t("leader.loading")} />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  if (ranked.length === 0) {
    return (
      <div className="animate-rise">
        <div className="panel p-12 text-center text-sm text-muted">
          {t("leader.empty")}
        </div>
      </div>
    );
  }

  const podium = ranked.filter((e) => e.rank <= 3);
  const rest = ranked.filter((e) => e.rank > 3);

  return (
    <div className="animate-rise space-y-8">
      <header className="relative z-20 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line/70 bg-surface/40 p-5 backdrop-blur-sm sm:p-6">
        <div className="min-w-0">
          <div className="eyebrow text-accent">{t("leader.eyebrow")}</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("leader.title")}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t("leader.subtitle")}
          </p>
        </div>
        <Select<LeaderMetric>
          label={t("leader.sortLabel")}
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRIC_CMP) as LeaderMetric[]).map((m) => ({
            id: m,
            label: t(METRIC_SORT_KEY[m]),
          }))}
          className="shrink-0"
        />
      </header>

      <section className="grid gap-4 sm:grid-cols-3 sm:items-end sm:pt-4">
        {podium.map((entry) => (
          <PodiumCard key={entry.steamId} entry={entry} metric={metric} />
        ))}
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">{t("leader.rest")}</h2>
          <ul className="grid gap-2">
            {rest.map((entry, i) => (
              // Стрічка ліги стартує після п'єдесталу (базові 240мс + стаггер).
              <LadderRow
                key={entry.steamId}
                entry={entry}
                style={{ animationDelay: `${240 + Math.min(i, 12) * 35}ms` }}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
