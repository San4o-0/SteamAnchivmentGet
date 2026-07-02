import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { LibraryEntry } from "@/api/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn, formatDate, formatHours, formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function GameCard({
  game,
  className,
  style,
}: {
  game: LibraryEntry;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useT();
  const complete = game.completion >= 100;
  // Loot rarity tier by average achievement rarity (lower = rarer drop),
  // thresholds per the six-tier loot table.
  const rarityDot =
    game.rarity < 1
      ? "bg-mythic shadow-mythic"
      : game.rarity < 5
        ? "bg-gold shadow-gold"
        : game.rarity < 10
          ? "bg-epic"
          : game.rarity < 20
            ? "bg-rare"
            : game.rarity < 50
              ? "bg-uncommon"
              : "bg-common";

  return (
    <Link
      to={`/game/${game.appId}`}
      className={cn(
        "panel panel-hover group flex flex-col overflow-hidden focus-visible:border-accent",
        className,
      )}
      style={style}
    >
      {/* sheen-sweep: діагональний відблиск ковзає по обкладинці на hover */}
      <div className="sheen-sweep relative aspect-[3/4] overflow-hidden border-b border-line/60 bg-raised">
        <img
          src={game.cover}
          alt={game.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />

        <div
          className={cn(
            // Суцільна заливка + контрастний текст — читабельно на будь-якій
            // обкладинці; тінь відділяє бейдж від світлих ділянок арту.
            "absolute right-2 top-2 rounded-md px-2 py-0.5 font-mono text-[0.72rem] font-bold tabular-nums shadow-[0_2px_8px_rgba(0,0,0,0.55)]",
            complete
              ? "bg-gold text-[#141519]"
              : "bg-accent text-white",
          )}
        >
          {formatPercent(game.completion)}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {game.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <ProgressBar value={game.completion} />
        <div className="flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-wide text-muted">
          <span className="tabular-nums text-ink/85">
            {game.achDone}/{game.achTotal} ach
          </span>
          <span className="tabular-nums">{formatHours(game.hours)}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[0.7rem] text-muted">
          <span
            className="flex items-center gap-1.5"
            title={t("lib.avgRarity")}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", rarityDot)} />
            <span className="tabular-nums">{t("lib.rarity")} {game.rarity}</span>
          </span>
          <span className="tabular-nums">{formatDate(game.lastPlayed)}</span>
        </div>
      </div>
    </Link>
  );
}
