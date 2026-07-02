import { useMemo, useState } from "react";
import { useLibrary } from "@/api/hooks";
import type { LibraryEntry } from "@/api/types";
import { GameCard } from "@/components/library/GameCard";
import {
  FILTERS,
  LibraryFilters,
  type FilterId,
} from "@/components/library/LibraryFilters";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";

const predicates: Record<FilterId, (g: LibraryEntry) => boolean> = {
  all: () => true,
  unfinished: (g) => g.completion < 100,
  under10h: (g) => g.hours <= 10,
  easiest: (g) => g.completion < 100, // completed later by sort
};

export function LibraryPage() {
  const { data, isLoading, isError, refetch } = useLibrary();
  const [filter, setFilter] = useState<FilterId>("all");

  const counts = useMemo(() => {
    const base = data ?? [];
    return FILTERS.reduce(
      (acc, f) => {
        acc[f.id] = base.filter(predicates[f.id]).length;
        return acc;
      },
      {} as Record<FilterId, number>,
    );
  }, [data]);

  const games = useMemo(() => {
    const list = (data ?? []).filter(predicates[filter]);
    // "easiest to 100%": fewest achievements left, then highest completion.
    if (filter === "easiest") {
      return [...list].sort((a, b) => {
        const leftA = a.achTotal - a.achDone;
        const leftB = b.achTotal - b.achDone;
        return leftA - leftB || b.completion - a.completion;
      });
    }
    return list;
  }, [data, filter]);

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Бібліотека</div>
          <h1 className="font-display text-3xl font-bold">
            Твої ігри
            {data && (
              <span className="ml-2 font-mono text-lg text-muted">{data.length}</span>
            )}
          </h1>
        </div>
      </header>

      <LibraryFilters active={filter} onChange={setFilter} counts={counts} />

      {isLoading ? (
        <PageLoader label="Завантаження бібліотеки" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : games.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted">
          Немає ігор під цей фільтр.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {games.map((g) => (
            <GameCard key={g.appId} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
