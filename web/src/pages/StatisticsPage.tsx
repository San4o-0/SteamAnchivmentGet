import { Link } from "react-router-dom";
import { useLibrary, useStats } from "@/api/hooks";
import type { RarityTier } from "@/api/types";
import { StatTile } from "@/components/ui/StatTile";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn, formatPercent, rarityLabel } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { useT } from "@/lib/i18n";

// Порядок тірів у розподілі — від буденного лута до міфічного.
const TIER_ORDER: RarityTier[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

const tierBar: Record<RarityTier, string> = {
  common: "bg-common",
  uncommon: "bg-uncommon",
  rare: "bg-rare",
  epic: "bg-epic",
  legendary: "bg-gold shadow-gold",
  mythic: "bg-mythic shadow-mythic",
};

// Свотч легенди — ЛИШЕ колір, без свічень/кілець, щоб усі мітки були
// однакового розміру (glow лишається на самому розподільному барі).
const tierSwatch: Record<RarityTier, string> = {
  common: "bg-common",
  uncommon: "bg-uncommon",
  rare: "bg-rare",
  epic: "bg-epic",
  legendary: "bg-gold",
  mythic: "bg-mythic",
};

export function StatisticsPage() {
  const t = useT();
  const stats = useStats();
  const library = useLibrary();

  if (stats.isLoading) return <PageLoader label={t("stats.loadingStats")} />;
  if (stats.isError || !stats.data)
    return <ErrorState onRetry={() => stats.refetch()} />;

  const { totals, rarity, completionBuckets, topRareUnlocks } = stats.data;

  // «Найближчі до 100%» = незавершені ігри, найвищий completion зверху.
  // Гру вважаємо завершеною за зібраними ачивками (achDone >= achTotal),
  // щоб дробовий completion ~99.6, округлений до «100%», сюди не потрапляв.
  const nearComplete = (library.data ?? [])
    .filter((g) => g.achTotal > 0 && g.achDone < g.achTotal && g.completion < 100)
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 6);

  const tierCounts = TIER_ORDER.map((tier) => ({ tier, count: rarity[tier] }));
  const totalUnlocked = tierCounts.reduce((sum, t) => sum + t.count, 0);

  // Захист від ділення на нуль: порожня бібліотека → рівні нульові стовпчики.
  const maxBucket = Math.max(1, ...completionBuckets.map((b) => b.count));

  return (
    <div className="animate-rise space-y-8">
      {/* ── Заголовок ────────────────────────────────────────────── */}
      <header>
        <div className="eyebrow text-accent">{t("stats.eyebrow")}</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("stats.title")}
        </h1>
      </header>

      {/* ── Загальні показники ───────────────────────────────────── */}
      <section aria-label={t("stats.overviewLabel")}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label={t("stats.gamesLabel")}
            value={totals.games}
            hint={t("stats.gamesHint")}
            className="animate-rise"
            style={stagger(1)}
          />
          <StatTile
            label={t("stats.achievementsLabel")}
            value={totals.achievements.toLocaleString("uk-UA")}
            hint={t("stats.achievementsHint")}
            className="animate-rise"
            style={stagger(2)}
          />
          <StatTile
            label="Perfect Games"
            value={totals.perfectGames}
            hint={t("stats.perfectHint")}
            accent="done"
            className="animate-rise"
            style={stagger(3)}
          />
          <StatTile
            label={t("stats.avgLabel")}
            value={formatPercent(totals.avgCompletion)}
            hint={t("stats.avgHint")}
            className="animate-rise"
            style={stagger(4)}
          />
          <StatTile
            label="Rarity Score"
            value={totals.rarityScore.toLocaleString("uk-UA")}
            hint={t("stats.rarityScoreHint")}
            accent="accent"
            className="shadow-glow col-span-2 animate-rise md:col-span-1"
            style={stagger(5)}
          />
        </div>
      </section>

      {/* ── Рідкість + розподіл проходження ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Рідкість здобутого: стековий розподіл за тірами лута. */}
        <section
          className="panel animate-rise p-6"
          style={stagger(6)}
          aria-label={t("stats.rarityLabel")}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="eyebrow">{t("stats.rarityHeading")}</h2>
            <span className="font-mono text-xs tabular-nums text-muted">
              {totalUnlocked.toLocaleString("uk-UA")} {t("stats.totalSuffix")}
            </span>
          </div>
          <p className="mb-5 text-xs text-muted">
            {t("stats.rarityDesc")}
          </p>

          {totalUnlocked === 0 ? (
            <>
              <div className="h-3 w-full rounded-full bg-line/50" />
              <p className="mt-4 text-center text-sm text-muted">
                {t("stats.rarityEmpty")}
              </p>
            </>
          ) : (
            <>
              {/* Сегменти розділяє 2px проміжок поверхні, не обводка. */}
              <div
                className="flex h-3 w-full gap-0.5"
                role="img"
                aria-label={tierCounts
                  .map((t) => `${rarityLabel[t.tier]}: ${t.count}`)
                  .join(", ")}
              >
                {tierCounts
                  .filter((t) => t.count > 0)
                  .map((t) => (
                    <div
                      key={t.tier}
                      className={cn(
                        "h-full min-w-[6px] rounded-full transition-[width] duration-700 ease-out",
                        tierBar[t.tier],
                      )}
                      style={{ width: `${(t.count / totalUnlocked) * 100}%` }}
                    />
                  ))}
              </div>

              {/* Легенда: auto-fit — колонки не вужчі за вміст, зайві переносяться
                  на новий ряд (без накладань). Ідентичність несе кольорова мітка. */}
              <ul className="mt-5 grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(5.5rem,1fr))]">
                {tierCounts.map((t) => (
                  <li key={t.tier} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-sm",
                          tierSwatch[t.tier],
                        )}
                      />
                      <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                        {rarityLabel[t.tier]}
                      </span>
                    </div>
                    <div className="mt-1.5 font-display text-xl font-semibold tabular-nums leading-none">
                      {t.count.toLocaleString("uk-UA")}
                    </div>
                    <div className="mt-1 font-mono text-[0.66rem] tabular-nums text-muted">
                      {formatPercent((t.count / totalUnlocked) * 100)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Розподіл проходження: колонки з div-ів, без бібліотек. */}
        <section
          className="panel animate-rise p-6"
          style={stagger(7)}
          aria-label={t("stats.distributionLabel")}
        >
          <h2 className="eyebrow mb-1">{t("stats.distributionHeading")}</h2>
          <p className="mb-5 text-xs text-muted">{t("stats.distributionDesc")}</p>

          {completionBuckets.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t("stats.noData")}</p>
          ) : (
            <div className="flex h-44 items-end gap-3 border-b border-line/80 pb-px">
              {completionBuckets.map((b) => {
                const isPerfect = b.label === "100%";
                return (
                  <div
                    key={b.label}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    {/* Значення на вершині колонки — токен тексту, не колір серії. */}
                    <div className="mb-1.5 text-center font-mono text-xs tabular-nums text-muted">
                      {b.count}
                    </div>
                    <div
                      className={cn(
                        // 4px заокруглення на кінці даних, рівна основа, ≤24px завширшки.
                        "mx-auto w-full max-w-6 rounded-t bg-gradient-to-t transition-[height] duration-700 ease-out",
                        isPerfect
                          ? "from-[#2e5b2c] to-done shadow-[0_0_10px_rgba(74,157,72,0.35)]"
                          : "from-accent-dim to-accent",
                      )}
                      style={{
                        height: b.count === 0 ? "2px" : `${(b.count / maxBucket) * 100}%`,
                      }}
                      role="img"
                      aria-label={`${b.label}: ${b.count}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {completionBuckets.length > 0 && (
            <div className="mt-2 flex gap-3">
              {completionBuckets.map((b) => (
                <div
                  key={b.label}
                  className={cn(
                    "min-w-0 flex-1 truncate text-center font-mono text-[0.62rem] uppercase tracking-wider",
                    b.label === "100%" ? "text-done" : "text-muted",
                  )}
                >
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Найрідкісніші здобутки ────────────────────────────────── */}
      <section aria-label={t("stats.rareLabel")}>
        <h2 className="eyebrow mb-3">{t("stats.rareHeading")}</h2>
        {topRareUnlocks.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("stats.rareEmpty")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topRareUnlocks.slice(0, 6).map((u, i) => (
              <Link
                key={`${u.appId}-${u.ach.id}`}
                to={`/game/${u.appId}`}
                className="panel panel-hover animate-rise group flex items-center gap-3 p-4"
                style={stagger(i, 50)}
              >
                <img
                  src={u.ach.icon}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-md border border-line bg-raised object-cover transition-colors duration-200 group-hover:border-accent/60"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold tracking-tight transition-colors group-hover:text-accent">
                    {u.ach.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">{u.gameName}</div>
                  <div className="mt-2">
                    <RarityBadge
                      tier={u.ach.rarityTier}
                      globalPercent={u.ach.globalPercent}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Найближчі до 100% ─────────────────────────────────────── */}
      <section aria-label={t("stats.nearLabel")}>
        <h2 className="eyebrow mb-3">{t("stats.nearHeading")}</h2>
        {library.isLoading ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("stats.loadingGames")}
          </div>
        ) : nearComplete.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("stats.nearEmpty")}
          </div>
        ) : (
          <div className="grid gap-3">
            {nearComplete.map((g, i) => (
              <Link
                key={g.appId}
                to={`/game/${g.appId}`}
                className="panel panel-hover animate-rise group flex items-center gap-4 p-4"
                style={stagger(i, 50)}
              >
                <img
                  src={g.cover}
                  alt=""
                  className="h-16 w-12 shrink-0 rounded-md border border-line bg-raised object-cover shadow-case transition-colors duration-200 group-hover:border-accent/60"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-display font-semibold tracking-tight transition-colors group-hover:text-accent">
                      {g.name}
                    </h3>
                    <span className="shrink-0 font-mono text-base font-medium tabular-nums text-accent">
                      {formatPercent(g.completion)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={g.completion} />
                  </div>
                  <div className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                    {g.achDone}/{g.achTotal} {t("stats.achDoneDetails")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
