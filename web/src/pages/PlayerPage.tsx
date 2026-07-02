import { Link, useParams } from "react-router-dom";
import { usePlayer } from "@/api/hooks";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { BackLink } from "@/components/ui/BackLink";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function PlayerPage() {
  const t = useT();
  const { steamId = "" } = useParams();
  const { data, isLoading, isError, refetch } = usePlayer(steamId);

  if (isLoading) return <PageLoader label={t("player.loading")} />;
  if (isError || !data)
    return (
      <ErrorState title={t("player.notFound")} onRetry={() => refetch()} />
    );

  const { name, avatar, stats } = data;
  const s = stats.totals;
  const topAch = stats.topRareUnlocks;
  const topGames = stats.topGames;

  return (
    <div className="animate-rise space-y-8">
      <BackLink to="/leaderboard" label={t("player.backToLeague")} />

      {/* ---------- Hero ---------- */}
      <header className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-[90px]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <img
            src={avatar}
            alt=""
            className="h-20 w-20 rounded-2xl bg-raised object-cover ring-2 ring-accent ring-offset-2 ring-offset-base"
          />
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-accent">{t("player.eyebrow")}</div>
            <h1 className="truncate font-display text-4xl font-bold tracking-tight">
              {name}
            </h1>
            <a
              href={`https://steamcommunity.com/profiles/${data.steamId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-xs text-muted hover:text-accent"
            >
              {data.steamId} ↗
            </a>
          </div>
          <div className="ml-auto text-right">
            <div className="eyebrow">{t("dash.rarityScore")}</div>
            <div className="font-display text-5xl font-semibold tabular-nums leading-none text-accent">
              {Math.round(s.rarityScore).toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Stats tiles ---------- */}
      <section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label={t("dash.tileGames")} value={s.games} hint={t("dash.hintGames")} />
          <StatTile
            label={t("dash.tileAch")}
            value={s.achievements.toLocaleString()}
            hint={t("dash.hintAch")}
            accent="done"
          />
          <StatTile
            label={t("dash.tilePerfect")}
            value={s.perfectGames}
            hint={t("dash.hintPerfect")}
            accent="gold"
          />
          <StatTile
            label={t("dash.tileAvg")}
            value={formatPercent(s.avgCompletion)}
            hint={t("dash.hintAvg")}
          />
        </div>
      </section>

      {/* ---------- Top rare unlocks ---------- */}
      {topAch.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">{t("dash.topRare")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topAch.map((x) => (
              <Link
                key={`${x.appId}-${x.ach.id}`}
                to={`/game/${x.appId}`}
                className="panel panel-hover group flex items-center gap-3.5 p-3.5"
              >
                <img
                  src={x.ach.icon}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-line bg-raised object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-semibold tracking-tight transition-colors group-hover:text-accent">
                    {x.ach.name}
                  </h3>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {x.gameName}
                  </div>
                  <div className="mt-2">
                    <RarityBadge
                      tier={x.ach.rarityTier}
                      globalPercent={x.ach.globalPercent}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Top games ---------- */}
      {topGames.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">{t("player.topGames")}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {topGames.map((g) => (
              <Link
                key={g.appId}
                to={`/game/${g.appId}`}
                className="panel panel-hover group flex items-center gap-4 p-4"
              >
                <img
                  src={g.cover}
                  alt=""
                  className="h-20 w-14 shrink-0 rounded-md border border-line bg-raised object-cover"
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
                    {g.achDone}/{g.achTotal} {t("dash.achievements")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
