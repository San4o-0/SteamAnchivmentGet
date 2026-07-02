import type { RoadmapStep as Step } from "@/api/types";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { cn, formatEta } from "@/lib/format";

interface Props {
  appId: number;
  step: Step;
  isHardest: boolean;
}

export function RoadmapStep({ appId, step, isHardest }: Props) {
  const { ach } = step;
  const done = ach.unlocked;

  return (
    <li className="relative pl-12">
      <span
        className={cn(
          "absolute left-[10px] top-3 z-10 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border-2 font-mono text-[0.6rem] font-bold tabular-nums",
          done
            ? "border-done bg-done/20 text-done"
            : isHardest
              ? "glow-gold border-gold bg-gold/20 text-gold"
              : "border-accent bg-base text-accent shadow-node",
        )}
      >
        {done ? "✓" : step.order}
      </span>

      <div
        className={cn(
          "panel mb-3 flex items-center gap-4 p-4",
          isHardest && !done && "border-gold/40",
          done && "opacity-75",
        )}
      >
        <img
          src={ach.icon}
          alt=""
          className={cn(
            "h-12 w-12 shrink-0 rounded-lg border border-line bg-raised",
            !done && "grayscale",
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{ach.name}</h4>
            {isHardest && (
              <span
                className="font-mono text-[0.62rem] uppercase tracking-wider text-gold"
                title="Найважча ачивка на цьому маршруті"
              >
                ★ найважча
              </span>
            )}
            <RarityBadge tier={ach.rarityTier} globalPercent={ach.globalPercent} size="sm" />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{ach.desc}</p>
          <div className="mt-1.5 font-mono text-[0.7rem] text-muted">
            ETA ≈ <span className="text-ink/80">{formatEta(step.etaMinutes)}</span>
          </div>
        </div>

        <div className="shrink-0">
          <UnlockButton appId={appId} ids={[ach.id]} unlocked={done} size="sm" />
        </div>
      </div>
    </li>
  );
}
