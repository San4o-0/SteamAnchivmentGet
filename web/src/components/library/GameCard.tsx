import { Link } from "react-router-dom";
import type { LibraryEntry } from "@/api/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn, formatDate, formatHours, formatPercent } from "@/lib/format";

export function GameCard({ game }: { game: LibraryEntry }) {
  const complete = game.completion >= 100;

  return (
    <Link
      to={`/game/${game.appId}`}
      className="panel panel-hover group flex flex-col overflow-hidden focus-visible:border-accent"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-raised">
        <img
          src={game.cover}
          alt={game.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/20 to-transparent" />

        <div
          className={cn(
            "absolute right-2 top-2 rounded-md border px-2 py-1 font-mono text-xs font-bold tabular-nums backdrop-blur-sm",
            complete
              ? "border-done/50 bg-done/20 text-done shadow-gold"
              : "border-line/60 bg-base/70 text-ink",
          )}
        >
          {formatPercent(game.completion)}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-display text-base font-semibold leading-tight drop-shadow">
            {game.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <ProgressBar value={game.completion} />
        <div className="flex items-center justify-between font-mono text-[0.7rem] text-muted">
          <span className="tabular-nums text-ink/80">
            {game.achDone}/{game.achTotal} ach
          </span>
          <span className="tabular-nums">{formatHours(game.hours)}</span>
        </div>
        <div className="flex items-center justify-between text-[0.7rem] text-muted">
          <span title="Середня рідкість ачивок">Рідкість {game.rarity}</span>
          <span>{formatDate(game.lastPlayed)}</span>
        </div>
      </div>
    </Link>
  );
}
