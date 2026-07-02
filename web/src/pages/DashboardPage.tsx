import { Link } from "react-router-dom";
import { useLibrary, useMe } from "@/api/hooks";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPercent } from "@/lib/format";

export function DashboardPage() {
  const me = useMe();
  const library = useLibrary();

  if (me.isLoading) return <PageLoader label="Завантаження профілю" />;
  if (me.isError || !me.data)
    return <ErrorState onRetry={() => me.refetch()} />;

  const { name, avatar, stats } = me.data;

  // "Next up" — closest-to-done unfinished games, the natural next targets.
  const nextUp = (library.data ?? [])
    .filter((g) => g.completion < 100)
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 3);

  return (
    <div className="animate-rise space-y-8">
      <header className="flex items-center gap-4">
        <img
          src={avatar}
          alt=""
          className="h-14 w-14 rounded-xl border border-line bg-raised"
        />
        <div>
          <div className="eyebrow">Ласкаво просимо</div>
          <h1 className="font-display text-3xl font-bold">{name}</h1>
        </div>
      </header>

      <section>
        <h2 className="eyebrow mb-3">Загальна статистика</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Ігор" value={stats.games} hint="у бібліотеці" />
          <StatTile
            label="Ачивок"
            value={stats.achievements}
            hint="розблоковано всього"
            accent="done"
          />
          <StatTile
            label="Середній %"
            value={formatPercent(stats.avgCompletion)}
            hint="проходження бібліотеки"
          />
          <StatTile
            label="Rarity Score"
            value={stats.rarityScore.toLocaleString("uk-UA")}
            hint="за рідкісні ачивки"
            accent="gold"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Наступні цілі</h2>
          <Link
            to="/library"
            className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
          >
            Уся бібліотека →
          </Link>
        </div>

        {library.isLoading ? (
          <PageLoader label="Завантаження ігор" />
        ) : nextUp.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            Усі ігри пройдено на 100%. Легенда. 🏆
          </div>
        ) : (
          <div className="grid gap-3">
            {nextUp.map((g) => (
              <Link
                key={g.appId}
                to={`/game/${g.appId}/roadmap`}
                className="panel panel-hover flex items-center gap-4 p-4"
              >
                <img
                  src={g.cover}
                  alt=""
                  className="h-16 w-12 shrink-0 rounded-md border border-line bg-raised object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-display font-semibold">{g.name}</h3>
                    <span className="shrink-0 font-mono text-sm tabular-nums text-accent">
                      {formatPercent(g.completion)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={g.completion} />
                  </div>
                  <div className="mt-1.5 font-mono text-[0.68rem] text-muted">
                    {g.achDone}/{g.achTotal} ачивок · відкрити маршрут →
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
