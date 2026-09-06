"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokens } from "@/app/lib/api";
import { loadEntries, saveEntries, toWatchEntry } from "@/app/lib/storage";
import SearchResults from "@/app/search-results";
import TokenTable from "@/app/token-table";
import { useTokenSearch } from "@/app/use-token-search";
import type { Token, WatchEntry } from "@/app/lib/types";

const UNDO_MS = 8_000;

export default function Watchlist() {
  // Membership is persisted separately from live, mint-keyed metrics.
  const [entries, setEntries] = useState<WatchEntry[] | null>(null);
  const [metrics, setMetrics] = useState<Map<string, Token>>(new Map());

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [undo, setUndo] = useState<{ entry: WatchEntry; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const watchlist = entries ?? [];
  const watched = new Set(watchlist.map((entry) => entry.mint));

  // Use the caller's snapshot so a late response cannot change watchlist membership.
  const refresh = useCallback(async (mints: string[]) => {
    setIsRefreshing(true);
    try {
      const tokens = await fetchTokens(mints);
      setMetrics(new Map(tokens.map((token) => [token.id, token])));
      setUpdatedAt(new Date());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load token data.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadEntries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setEntries(stored);
    void refresh(stored.map((entry) => entry.mint));
  }, [refresh]);

  function commit(next: WatchEntry[]) {
    setEntries(next);
    saveEntries(next);
  }

  function clearUndo() {
    if (undoTimer.current !== null) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndo(null);
  }

  function add(token: Token) {
    clearUndo();
    commit([...watchlist, toWatchEntry(token)]);
    setMetrics((current) => new Map(current).set(token.id, token));
  }

  function toggle(token: Token) {
    if (watched.has(token.id)) {
      remove(token.id);
      return;
    }
    add(token);
  }

  function remove(mint: string) {
    const index = watchlist.findIndex((entry) => entry.mint === mint);
    const entry = watchlist[index];
    if (entry === undefined) return;

    clearUndo();
    commit(watchlist.filter((entry) => entry.mint !== mint));
    setUndo({ entry, index });
    undoTimer.current = setTimeout(() => {
      setUndo(null);
      undoTimer.current = null;
    }, UNDO_MS);
  }

  function restore() {
    if (undo === null) return;

    const { entry, index } = undo;
    clearUndo();
    commit([...watchlist.slice(0, index), entry, ...watchlist.slice(index)]);
  }

  useEffect(() => () => {
    if (undoTimer.current !== null) clearTimeout(undoTimer.current);
  }, []);

  const {
    query,
    search,
    rows,
    open,
    highlighted,
    searchRef,
    inputRef,
    setHighlighted,
    changeQuery,
    retry,
    handleKeyDown,
  } = useTokenSearch(toggle);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline gap-2">
        <h1 className="text-lg font-medium text-ink">Watchlist</h1>
        {entries === null ? null : <span className="text-sm text-faint">{entries.length}</span>}
      </div>

      <div ref={searchRef} className="mb-4" onKeyDown={handleKeyDown}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search by symbol, name, or mint"
            aria-label="Search tokens"
            className="h-[34px] w-full rounded-md border border-edge bg-surface px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent min-[480px]:max-w-[320px]"
          />
          <div className="ml-auto flex items-center gap-2 max-[479px]:ml-0 max-[479px]:w-full">
            {undo === null ? (
              <span className="min-w-0 flex-1 truncate text-xs text-faint">
                {error ??
                  (updatedAt === null ? " " : `Updated ${updatedAt.toLocaleTimeString("en-US")}`)}
              </span>
            ) : (
              <span role="status" className="min-w-0 flex-1 truncate text-xs text-faint">
                Removed {undo.entry.symbol} · {" "}
                <button
                  type="button"
                  onClick={restore}
                  className="font-medium text-ink underline decoration-edge underline-offset-2 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  Undo
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh(watchlist.map((entry) => entry.mint))}
              disabled={isRefreshing}
              aria-busy={isRefreshing}
              aria-label="Refresh prices"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`size-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span className="sr-only">{isRefreshing ? "Refreshing prices" : "Refresh prices"}</span>
            </button>
          </div>
        </div>
        <div
          inert={!open}
          className={`overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none ${
            open ? "h-[269px] min-[480px]:h-[297px]" : "h-0"
          }`}
        >
          <div
            className={`flex h-full flex-col pt-1 max-[479px]:transition-[opacity,transform] max-[479px]:duration-200 max-[479px]:ease-out motion-reduce:transition-none ${
              open ? "max-[479px]:translate-y-0 max-[479px]:opacity-100" : "max-[479px]:-translate-y-2 max-[479px]:opacity-0"
            }`}
          >
            <SearchResults
              state={search}
              rows={rows}
              watched={watched}
              highlighted={highlighted}
              onHighlight={setHighlighted}
              onToggle={toggle}
              onRetry={retry}
            />
          </div>
        </div>
      </div>

      {entries === null ? null : <TokenTable entries={entries} metrics={metrics} onRemove={remove} />}
    </div>
  );
}
