import { useParams } from "react-router-dom";
import { useGame, useRoadmap } from "@/api/hooks";
import { Timeline } from "@/components/roadmap/Timeline";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { BackLink } from "@/components/ui/BackLink";
import { useT } from "@/lib/i18n";

export function RoadmapPage() {
  const t = useT();
  const { appId } = useParams();
  const id = Number(appId);
  const game = useGame(id);
  const roadmap = useRoadmap(id);

  const gameName = game.data?.name;

  return (
    <div className="animate-rise space-y-6">
      <BackLink to={`/game/${id}`} label={gameName ? `${t("road.backTo")} ${gameName}` : t("road.backToGame")} />

      <header className="rounded-xl border border-line/70 bg-surface/40 p-5 backdrop-blur-sm sm:p-6">
        <div className="eyebrow text-accent">Quest Line</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
          {t("road.routeTo100")}
        </h1>
        <p className="mt-1 font-mono text-sm uppercase tracking-[0.14em] text-muted">
          {gameName ?? t("road.route")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("road.introBefore")}{" "}
          <span className="text-gold">★</span>{t("road.introAfter")}
        </p>
      </header>

      {roadmap.isLoading ? (
        <PageLoader label={t("road.buildingRoute")} />
      ) : roadmap.isError || !roadmap.data ? (
        <ErrorState title={t("road.routeUnavailable")} onRetry={() => roadmap.refetch()} />
      ) : (
        <Timeline appId={id} roadmap={roadmap.data} />
      )}
    </div>
  );
}
