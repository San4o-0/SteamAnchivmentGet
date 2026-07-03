import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAgentProgress, useGame } from "@/api/hooks";
import { AchievementRow } from "@/components/game/AchievementRow";
import {
  ACH_SORTS,
  AchievementSort,
  type AchSortId,
} from "@/components/game/AchievementSort";
import { DifficultyStars } from "@/components/ui/DifficultyStars";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { BackLink } from "@/components/ui/BackLink";
import { WormLink } from "@/components/ui/WormLink";
import { formatPercent } from "@/lib/format";
import { stagger, useCountUp } from "@/lib/motion";
import { useT } from "@/lib/i18n";

export function GameDetailPage() {
  const t = useT();
  const { appId } = useParams();
  const id = Number(appId);
  const { data, isLoading, isError, refetch } = useGame(id);
  // Which achievements are progress/stat-gated (from the local agent). Absent
  // when the agent is offline — then nothing is gated, unlock stays available.
  const { data: agentProgress } = useAgentProgress(id);
  const progressMap = agentProgress?.ok ? agentProgress.progress : undefined;

  // Великий % «набігає» до значення (хук — до ранніх return-ів).
  const completionCount = useCountUp(data?.completion ?? 0);

  // Сортування списку ачивок (хук — до ранніх return-ів).
  const [achSort, setAchSort] = useState<AchSortId>("default");
  const sortedAchievements = useMemo(() => {
    const list = data?.achievements ?? [];
    const cmp = ACH_SORTS.find((s) => s.id === achSort)?.cmp;
    return cmp ? [...list].sort(cmp) : list;
  }, [data?.achievements, achSort]);

  if (isLoading) return <PageLoader label={t("game.loadingGame")} />;
  if (isError || !data)
    return (
      <div className="space-y-4">
        <BackLink to="/library" label={t("game.library")} />
        <ErrorState title={t("game.notFound")} onRetry={() => refetch()} />
      </div>
    );

  const done = data.achievements.filter((a) => a.unlocked).length;
  const total = data.achievements.length;
  const remaining = total - done;

  // Топ-дропи: заблоковані ачивки верхніх тірів (legendary + mythic).
  const topDropsLocked = data.achievements.filter(
    (a) =>
      !a.unlocked &&
      (a.rarityTier === "legendary" || a.rarityTier === "mythic"),
  ).length;

  return (
    <div className="animate-rise space-y-6">
      <BackLink to="/library" label={t("game.library")} />

      {/* HUD command header: game title + rarity readouts + primary loot action. */}
      <header className="panel relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">App {data.appId}</div>
            <h1 className="mt-1.5 font-display text-4xl font-bold leading-tight tracking-tight text-ink">
              {data.name}
            </h1>

            {/* HUD meta row: glowing completion readout · difficulty pips · ETA. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-4xl font-bold leading-none tabular-nums text-accent [text-shadow:0_0_20px_rgba(139,92,246,0.65)]">
                  {formatPercent(completionCount)}
                </span>
                <span className="eyebrow">{t("game.completed")}</span>
              </div>
              <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
              <div className="flex items-center gap-2.5">
                <span className="eyebrow">{t("game.difficulty")}</span>
                <DifficultyStars value={data.difficulty} />
              </div>
              <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
              <span className="font-mono text-sm text-muted">
                ≈ <span className="text-ink">{data.estHoursTo100} {t("game.hours")}</span> {t("game.to100")}
              </span>
            </div>

            <div className="mt-5 max-w-md">
              <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
                <span className="text-muted">
                  {done}/{total} {t("game.achievementsCollected")}
                </span>
                <span className="tabular-nums text-muted">
                  {t("game.remaining")} {remaining}
                </span>
              </div>
              <ProgressBar value={data.completion} />
            </div>
          </div>

          {/* Primary loot action — той самий стиль, що й кнопки з рамкою-черв'яком. */}
          <WormLink
            to={`/game/${data.appId}/roadmap`}
            className="group self-start px-6 py-3.5 font-display text-[1rem] font-semibold lg:self-center"
          >
            {t("game.unlockRoute")}
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </WormLink>
        </div>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="eyebrow">{t("game.achievementInventory")}</h2>
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
            <span>
              {t("game.remaining")} <span className="text-ink">{remaining}</span>
            </span>
            {topDropsLocked > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded border border-gold/40 bg-gold/10 px-2 py-0.5 uppercase tracking-wider text-gold">
                <span aria-hidden>✦</span>
                {t("game.topDrops")} {topDropsLocked}
              </span>
            )}
            <AchievementSort value={achSort} onChange={setAchSort} />
          </div>
        </div>

        <div className="grid gap-2.5">
          {sortedAchievements.map((ach, i) => (
            <AchievementRow
              key={ach.id}
              appId={data.appId}
              ach={ach}
              style={stagger(i)}
              progressGate={progressMap?.[ach.id]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
