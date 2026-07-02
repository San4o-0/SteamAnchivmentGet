import type { Ach } from "@/api/types";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { UnlockButton } from "@/components/ui/UnlockButton";
import { cn } from "@/lib/format";

export function AchievementRow({ appId, ach }: { appId: number; ach: Ach }) {
  return (
    <div
      className={cn(
        "panel flex items-center gap-4 p-3.5 transition-colors",
        ach.unlocked ? "opacity-90" : "hover:border-line",
        ach.rarityTier === "ultra" && "border-gold/30",
      )}
    >
      <div className="relative shrink-0">
        <img
          src={ach.icon}
          alt=""
          className={cn(
            "h-12 w-12 rounded-lg border bg-raised",
            ach.unlocked ? "border-line" : "border-line/60 grayscale",
            ach.rarityTier === "ultra" && ach.unlocked && "shadow-gold",
          )}
        />
        {ach.unlocked && (
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-base bg-done text-base">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-medium">{ach.name}</h4>
          <RarityBadge tier={ach.rarityTier} globalPercent={ach.globalPercent} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{ach.desc}</p>
      </div>

      <div className="shrink-0">
        <UnlockButton appId={appId} ids={[ach.id]} unlocked={ach.unlocked} size="sm" />
      </div>
    </div>
  );
}
