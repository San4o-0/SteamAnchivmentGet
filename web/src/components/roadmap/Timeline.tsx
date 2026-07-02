import { useMemo } from "react";
import type { Roadmap, RoadmapGroup } from "@/api/types";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { formatEta } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { useT } from "@/lib/i18n";
import { RoadmapStep } from "./RoadmapStep";

const GROUP_ORDER: RoadmapGroup[] = ["start", "mid", "end"];
const GROUP_META: Record<RoadmapGroup, { title: string; hint: string }> = {
  start: { title: "road.groupStartTitle", hint: "road.groupStartHint" },
  mid: { title: "road.groupMidTitle", hint: "road.groupMidHint" },
  end: { title: "road.groupEndTitle", hint: "road.groupEndHint" },
};

export function Timeline({ appId, roadmap }: { appId: number; roadmap: Roadmap }) {
  const t = useT();
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
        <p className="font-display text-lg">{t("road.routeComplete")}</p>
        <p className="text-sm text-muted">{t("road.allUnlocked")}</p>
      </div>
    );
  }

  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    items: steps.filter((s) => s.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Зведення входить після заголовка сторінки — єдиний ритм: title → content. */}
      <div
        className="panel animate-rise mb-6 flex flex-wrap items-center justify-between gap-4 p-4"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-center gap-8">
          <div>
            <div className="eyebrow">{t("road.stepsLeft")}</div>
            <div className="font-display text-3xl font-bold tabular-nums text-accent">
              {remainingIds.length}
            </div>
          </div>
          <div className="h-10 w-px bg-line" />
          <div>
            <div className="eyebrow">{t("road.totalEta")}</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-ink">
              {formatEta(totalEta)}
            </div>
          </div>
        </div>
        {remainingIds.length > 0 && (
          <UnlockButton appId={appId} ids={remainingIds} label={`${t("road.unlockAll")} (${remainingIds.length})`} />
        )}
      </div>

      <div className="relative">
        {/* Quest line: violet spine climbing toward the legendary finale */}
        <span className="absolute bottom-2 left-[14px] top-3 w-[2px] -translate-x-1/2 bg-gradient-to-b from-accent via-accent/40 to-gold/70" />

        <div className="flex flex-col gap-8">
          {byGroup.map(({ group, items }, gi) => {
            // Наскрізний індекс кроку через усі групи — один спільний
            // стаггер-ритм квест-лінії (з капом, щоб довгі маршрути не чекали).
            const offset = byGroup
              .slice(0, gi)
              .reduce((n, g) => n + g.items.length, 0);
            return (
              <section key={group}>
                <header
                  className="animate-rise relative mb-4 pl-14"
                  style={stagger(offset)}
                >
                  {/* Phase marker node on the quest line */}
                  <span className="absolute left-[14px] top-0.5 z-10 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-accent bg-base shadow-node" />
                  <h3 className="eyebrow text-accent">{t(GROUP_META[group].title)}</h3>
                  <p className="mt-0.5 text-xs text-muted">{t(GROUP_META[group].hint)}</p>
                </header>
                <ol className="flex flex-col">
                  {items.map((step, i) => (
                    <RoadmapStep
                      key={step.ach.id}
                      appId={appId}
                      step={step}
                      isHardest={step.ach.id === hardestId}
                      style={stagger(offset + i + 1)}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
