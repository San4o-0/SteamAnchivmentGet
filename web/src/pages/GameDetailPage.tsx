import { Link, useParams } from "react-router-dom";
import { useGame } from "@/api/hooks";
import { AchievementRow } from "@/components/game/AchievementRow";
import { DifficultyStars } from "@/components/ui/DifficultyStars";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { BackLink } from "@/components/ui/BackLink";
import { formatPercent } from "@/lib/format";

export function GameDetailPage() {
  const { appId } = useParams();
  const id = Number(appId);
  const { data, isLoading, isError, refetch } = useGame(id);

  if (isLoading) return <PageLoader label="Завантаження гри" />;
  if (isError || !data)
    return (
      <div className="space-y-4">
        <BackLink to="/library" label="До бібліотеки" />
        <ErrorState title="Гру не знайдено" onRetry={() => refetch()} />
      </div>
    );

  const done = data.achievements.filter((a) => a.unlocked).length;
  const total = data.achievements.length;
  const remaining = total - done;

  const ultraLocked = data.achievements.filter(
    (a) => !a.unlocked && a.rarityTier === "ultra",
  ).length;

  return (
    <div className="animate-rise space-y-6">
      <BackLink to="/library" label="До бібліотеки" />

      <header className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="eyebrow">App {data.appId}</div>
          <h1 className="mt-1 font-display text-3xl font-bold">{data.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              Складність <DifficultyStars value={data.difficulty} />
            </span>
            <span className="font-mono">
              До 100%: <span className="text-ink">≈ {data.estHoursTo100} год</span>
            </span>
          </div>

          <div className="mt-4 max-w-md">
            <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
              <span className="text-muted">
                {done}/{total} ачивок
              </span>
              <span className="tabular-nums text-accent">
                {formatPercent(data.completion)}
              </span>
            </div>
            <ProgressBar value={data.completion} />
          </div>
        </div>

        <Link
          to={`/game/${data.appId}/roadmap`}
          className="group inline-flex items-center gap-2 self-start rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 font-display font-semibold text-gold shadow-gold transition-all hover:bg-gold/20 sm:self-center"
        >
          Відкрити маршрут
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Ачивки</h2>
          <div className="flex gap-4 font-mono text-xs text-muted">
            <span>лишилось: <span className="text-ink">{remaining}</span></span>
            {ultraLocked > 0 && (
              <span className="text-gold">ultra: {ultraLocked}</span>
            )}
          </div>
        </div>

        <div className="grid gap-2.5">
          {data.achievements.map((ach) => (
            <AchievementRow key={ach.id} appId={data.appId} ach={ach} />
          ))}
        </div>
      </section>
    </div>
  );
}
