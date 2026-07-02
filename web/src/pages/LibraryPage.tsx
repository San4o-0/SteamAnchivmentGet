import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLibrary } from "@/api/hooks";
import type { LibraryEntry } from "@/api/types";
import { GameCard } from "@/components/library/GameCard";
import {
  FILTERS,
  LibraryFilters,
  type FilterId,
} from "@/components/library/LibraryFilters";
import { LibrarySort, SORTS, type SortId } from "@/components/library/LibrarySort";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { stagger } from "@/lib/motion";
import { useT } from "@/lib/i18n";

// Гру вважаємо завершеною за зібраними ачивками, а не за округленим completion.
const isComplete = (g: LibraryEntry) => g.achTotal > 0 && g.achDone >= g.achTotal;

const predicates: Record<FilterId, (g: LibraryEntry) => boolean> = {
  all: () => true,
  unfinished: (g) => !isComplete(g),
  completed: (g) => isComplete(g),
  under10h: (g) => g.hours <= 10,
};

export function LibraryPage() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useLibrary();

  const [searchParams] = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("closest");

  const query = term.trim().toLowerCase();

  // Пошук за назвою — база для лічильників фільтрів і сітки.
  const searched = useMemo(() => {
    const base = data ?? [];
    if (!query) return base;
    return base.filter((g) => g.name.toLowerCase().includes(query));
  }, [data, query]);

  const counts = useMemo(() => {
    return FILTERS.reduce(
      (acc, f) => {
        acc[f.id] = searched.filter(predicates[f.id]).length;
        return acc;
      },
      {} as Record<FilterId, number>,
    );
  }, [searched]);

  const games = useMemo(() => {
    const cmp = SORTS.find((s) => s.id === sort)?.cmp;
    const list = searched.filter(predicates[filter]);
    return cmp ? [...list].sort(cmp) : list;
  }, [searched, filter, sort]);

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{t("lib.eyebrow")}</div>
          <h1 className="font-display text-3xl font-bold">
            {t("lib.yourGames")}
            {data && (
              <span className="ml-2 font-mono text-lg text-muted">{data.length}</span>
            )}
          </h1>
        </div>

        {/* Пошук живе тут (а не в глобальному топбарі) */}
        <label className="relative w-full max-w-xs sm:w-72">
          <span className="sr-only">{t("lib.searchLabel")}</span>
          <SearchIcon />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("lib.searchPlaceholder")}
            aria-label={t("lib.searchLabel")}
            className="w-full rounded-md border border-line/70 bg-raised/60 py-2 pl-9 pr-8 text-sm text-ink placeholder:text-muted focus:border-accent/60 focus:shadow-glow focus:outline-none"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label={t("lib.searchClear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded text-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </label>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LibraryFilters active={filter} onChange={setFilter} counts={counts} />
        <LibrarySort value={sort} onChange={setSort} />
      </div>

      {isLoading ? (
        <PageLoader label={t("lib.loading")} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : games.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted">
          {query ? t("lib.emptySearch") : t("lib.empty")}
        </div>
      ) : (
        <>
          <div className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
            {games.length} / {searched.length} {t("lib.resultsSuffix")}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {games.map((g, i) => (
              <GameCard
                key={g.appId}
                game={g}
                className="animate-rise"
                style={stagger(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
