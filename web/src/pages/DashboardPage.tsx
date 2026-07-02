import { Link } from "react-router-dom";
import { useLibrary, useMe, useStats } from "@/api/hooks";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPercent, formatHours } from "@/lib/format";
import { stagger, useCountUp } from "@/lib/motion";
import { useT } from "@/lib/i18n";

export function DashboardPage() {
  const t = useT();
  const me = useMe();
  const library = useLibrary();
  const stats = useStats();

  if (me.isLoading) return <PageLoader label={t("login.loadingProfile")} />;
  if (me.isError || !me.data) return <ErrorState onRetry={() => me.refetch()} />;

  const { name, avatar, stats: s } = me.data;
  const perfect = stats.data?.totals.perfectGames;

  // "Next up" — незавершені ігри, найближчі до 100%. Гру вважаємо завершеною,
  // коли зібрані ВСІ ачивки (achDone >= achTotal) — так виключаємо ігри, чий
  // дробовий completion (напр. 99.6) округлився б до «100%», але фактично готовий.
  const nextUp = (library.data ?? [])
    .filter((g) => g.achTotal > 0 && g.achDone < g.achTotal && g.completion < 100)
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 6);

  const topAch = stats.data?.topRareUnlocks ?? [];

  return (
    <div className="animate-rise space-y-10">
      {/* ---------- Hero ---------- */}
      <header className="panel hero-pulse relative overflow-hidden p-6 sm:p-8">
        {/* Ambient blobs slowly drift + breathe so the hero never sits still. */}
        <div className="float-blob pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-[90px]" />
        <div className="float-blob-alt pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-gold/8 blur-[90px]" />

        <div className="relative flex flex-wrap items-center gap-5">
          {/* Avatar with a crisp accent ring + a separate breathing glow layer. */}
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt=""
              className="h-20 w-20 rounded-2xl bg-raised object-cover ring-2 ring-accent ring-offset-2 ring-offset-base"
            />
            <span
              aria-hidden
              className="ring-breathe pointer-events-none absolute inset-0 rounded-2xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-accent">{t("dash.welcome")}</div>
            <h1 className="truncate font-display text-4xl font-bold tracking-tight">
              {name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wider text-muted">
              <span
                className="animate-rise rounded-md border border-line bg-raised px-2 py-1"
                style={stagger(1, 90)}
              >
                {s.games} {t("dash.games")}
              </span>
              <span
                className="animate-rise rounded-md border border-line bg-raised px-2 py-1 text-done"
                style={stagger(2, 90)}
              >
                {s.achievements.toLocaleString()} {t("dash.achievements")}
              </span>
              {perfect !== undefined && (
                <span
                  className="animate-rise rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-gold shadow-gold"
                  style={stagger(3, 90)}
                >
                  <span className="bob mr-0.5 inline-block">🏆</span> {perfect}{" "}
                  {t("dash.perfect")}
                </span>
              )}
            </div>
          </div>

          {/* Rarity score highlight — counts up on load. */}
          <div className="ml-auto text-right">
            <div className="eyebrow">{t("dash.rarityScore")}</div>
            <div className="font-display text-5xl font-semibold tabular-nums leading-none text-accent">
              <RarityCounter value={s.rarityScore} />
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Stats ---------- */}
      <section>
        <h2 className="animate-rise eyebrow mb-3" style={stagger(1)}>
          {t("dash.overall")}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label={t("dash.tileGames")}
            value={s.games}
            hint={t("dash.hintGames")}
            className="animate-rise"
            style={stagger(2)}
          />
          <StatTile
            label={t("dash.tileAch")}
            value={s.achievements.toLocaleString()}
            hint={t("dash.hintAch")}
            accent="done"
            className="animate-rise"
            style={stagger(3)}
          />
          <StatTile
            label={t("dash.tilePerfect")}
            value={perfect ?? "—"}
            hint={t("dash.hintPerfect")}
            accent="gold"
            className="animate-rise"
            style={stagger(4)}
          />
          <StatTile
            label={t("dash.tileAvg")}
            value={formatPercent(s.avgCompletion)}
            hint={t("dash.hintAvg")}
            className="animate-rise"
            style={stagger(5)}
          />
        </div>
      </section>

      {/* ---------- Top achievements ---------- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">{t("dash.topRare")}</h2>
          <Link
            to="/statistics"
            className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
          >
            {t("dash.allStats")}
          </Link>
        </div>

        {stats.isLoading ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("dash.topRareLoading")}
          </div>
        ) : topAch.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("dash.topRareEmpty")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topAch.map((t, i) => (
              <Link
                key={`${t.appId}-${t.ach.id}`}
                to={`/game/${t.appId}`}
                className="panel panel-hover animate-rise group flex items-center gap-3.5 p-3.5"
                style={stagger(i, 50)}
              >
                <div className="relative shrink-0">
                  <div className="sheen-sweep relative h-14 w-14 overflow-hidden rounded-lg border border-line bg-raised transition-colors group-hover:border-accent/60">
                    <img
                      src={t.ach.icon}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                  </div>
                  <span className="pointer-events-none absolute -inset-px rounded-lg ring-1 ring-inset ring-mythic/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-semibold tracking-tight transition-colors group-hover:text-accent">
                    {t.ach.name}
                  </h3>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {t.gameName}
                  </div>
                  <div className="mt-2">
                    <RarityBadge
                      tier={t.ach.rarityTier}
                      globalPercent={t.ach.globalPercent}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Next up games ---------- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">{t("dash.nextGoals")}</h2>
          <Link
            to="/library"
            className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
          >
            {t("dash.allLibrary")}
          </Link>
        </div>

        {library.isLoading ? (
          <PageLoader label={t("dash.loadingGames")} />
        ) : nextUp.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            {t("dash.allPerfect")}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {nextUp.map((g, i) => (
              <Link
                key={g.appId}
                to={`/game/${g.appId}/roadmap`}
                className="panel panel-hover animate-rise group flex items-center gap-4 p-4"
                style={stagger(i, 50)}
              >
                <div className="sheen-sweep relative h-20 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-raised shadow-case transition-colors duration-200 group-hover:border-accent/60">
                  <img
                    src={g.cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-display font-semibold tracking-tight transition-colors group-hover:text-accent">
                      {g.name}
                    </h3>
                    <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-ink">
                      {formatPercent(g.completion)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={g.completion} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                    <span>
                      {g.achDone}/{g.achTotal} {t("dash.achievements")}
                    </span>
                    <span className="text-accent/80">
                      {formatHours(g.hours)} · {t("dash.route")}
                    </span>
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

// Rarity Score, що «набігає» до цілі при завантаженні (rAF, ease-out).
// При reduced-motion useCountUp одразу віддає ціль — число статичне.
function RarityCounter({ value }: { value: number }) {
  const count = useCountUp(value, { duration: 1100 });
  return <>{Math.round(count).toLocaleString("uk-UA")}</>;
}
