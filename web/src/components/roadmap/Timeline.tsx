import { useMemo } from "react";
import type { Roadmap, RoadmapGroup } from "@/api/types";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { formatEta } from "@/lib/format";
import { RoadmapStep } from "./RoadmapStep";

const GROUP_ORDER: RoadmapGroup[] = ["start", "mid", "end"];
const GROUP_META: Record<RoadmapGroup, { title: string; hint: string }> = {
  start: { title: "Спочатку", hint: "Легкий старт — розігрів" },
  mid: { title: "Потім", hint: "Основний грінд" },
  end: { title: "Наприкінці", hint: "Найрідкісніше — фінальний ривок" },
};

export function Timeline({ appId, roadmap }: { appId: number; roadmap: Roadmap }) {
  const { steps } = roadmap;

  // The hardest step = lowest globalPercent among the not-yet-unlocked ones.
  const hardestId = useMemo(() => {
    const locked = steps.filter((s) => !s.ach.unlocked);
    if (locked.length === 0) return null;
    return locked.reduce((min, s) =>
      s.ach.globalPercent < min.ach.globalPercent ? s : min,
    ).ach.id;
  }, [steps]);

  const remainingIds = steps
    .filter((s) => !s.ach.unlocked)
    .map((s) => s.ach.id);

  const totalEta = steps
    .filter((s) => !s.ach.unlocked)
    .reduce((sum, s) => sum + s.etaMinutes, 0);

  if (steps.length === 0) {
    return (
      <div className="panel grid place-items-center gap-2 p-12 text-center">
        <span className="text-3xl">🏆</span>
        <p className="font-display text-lg">Маршрут пройдено</p>
        <p className="text-sm text-muted">Усі ачивки цієї гри розблоковані.</p>
      </div>
    );
  }

  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    items: steps.filter((s) => s.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="eyebrow">Кроків лишилось</div>
            <div className="font-display text-2xl font-bold tabular-nums text-accent">
              {remainingIds.length}
            </div>
          </div>
          <div>
            <div className="eyebrow">Сумарний ETA</div>
            <div className="font-display text-2xl font-bold tabular-nums">
              {formatEta(totalEta)}
            </div>
          </div>
        </div>
        {remainingIds.length > 0 && (
          <UnlockButton appId={appId} ids={remainingIds} label={`Unlock усі (${remainingIds.length})`} />
        )}
      </div>

      <div className="relative">
        <span className="absolute bottom-2 left-[10px] top-2 w-px bg-gradient-to-b from-accent/60 via-line to-gold/50" />

        <div className="flex flex-col gap-8">
          {byGroup.map(({ group, items }) => (
            <section key={group}>
              <header className="relative mb-3 pl-12">
                <span className="absolute left-[10px] top-1 z-10 h-3 w-3 -translate-x-1/2 rounded-sm border border-line bg-raised" />
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ink">
                  {GROUP_META[group].title}
                </h3>
                <p className="text-xs text-muted">{GROUP_META[group].hint}</p>
              </header>
              <ol className="flex flex-col">
                {items.map((step) => (
                  <RoadmapStep
                    key={step.ach.id}
                    appId={appId}
                    step={step}
                    isHardest={step.ach.id === hardestId}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
