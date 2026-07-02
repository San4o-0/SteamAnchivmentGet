import { useParams } from "react-router-dom";
import { useGame, useRoadmap } from "@/api/hooks";
import { Timeline } from "@/components/roadmap/Timeline";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { BackLink } from "@/components/ui/BackLink";

export function RoadmapPage() {
  const { appId } = useParams();
  const id = Number(appId);
  const game = useGame(id);
  const roadmap = useRoadmap(id);

  const gameName = game.data?.name;

  return (
    <div className="animate-rise space-y-6">
      <BackLink to={`/game/${id}`} label={gameName ? `До ${gameName}` : "До гри"} />

      <header>
        <div className="eyebrow">Маршрут до 100%</div>
        <h1 className="mt-1 font-display text-3xl font-bold">
          {gameName ?? "Маршрут"}
        </h1>
        <p className="mt-1.5 max-w-lg text-sm text-muted">
          Кроки впорядковані від найлегших до найрідкісніших. Найважча ачивка
          позначена{" "}
          <span className="text-gold">★</span>. Тисни Unlock на будь-якому кроці
          або розблокуй увесь маршрут одразу.
        </p>
      </header>

      {roadmap.isLoading ? (
        <PageLoader label="Побудова маршруту" />
      ) : roadmap.isError || !roadmap.data ? (
        <ErrorState title="Маршрут недоступний" onRetry={() => roadmap.refetch()} />
      ) : (
        <Timeline appId={id} roadmap={roadmap.data} />
      )}
    </div>
  );
}
