"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokens, searchTokens } from "@/app/lib/api";
import { loadEntries, saveEntries, toWatchEntry } from "@/app/lib/storage";
import SearchResults, { arrange, type SearchState } from "@/app/search-results";
import TokenTable from "@/app/token-table";
import type { Token, WatchEntry } from "@/app/lib/types";

const DEBOUNCE_MS = 250;
const UNDO_MS = 8_000;

// No row is highlighted until an arrow key asks for one, so Enter on a fresh search does
// nothing rather than adding whatever happens to be first.
const NO_HIGHLIGHT = -1;

export default function Watchlist() {
  // Membership is persisted separately from live, mint-keyed metrics.
  const [entries, setEntries] = useState<WatchEntry[] | null>(null);
  const [metrics, setMetrics] = useState<Map<string, Token>>(new Map());

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "loading" });
  const [highlighted, setHighlighted] = useState(NO_HIGHLIGHT);
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [undo, setUndo] = useState<{ entry: WatchEntry; index: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch((current) =>
        current.kind === "ready" ? { ...current, stale: true } : { kind: "loading" },
      );
      try {
        const results = await searchTokens(trimmed, controller.signal);
        setSearch({ kind: "ready", query: trimmed, results, stale: false });
      } catch (caught) {
        if (controller.signal.aborted) return;
        setSearch({
          kind: "error",
          message: caught instanceof Error ? caught.message : "Search failed.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  const open = query.trim() !== "" && !dismissed;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const root = searchRef.current;
      if (root !== null && !root.contains(event.target as Node)) setDismissed(true);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleQueryChange(next: string) {
    setQuery(next);
    setDismissed(false);
    setHighlighted(NO_HIGHLIGHT);
    if (next.trim() === "") setSearch({ kind: "loading" });
  }

  function handleRetry() {
    setSearch({ kind: "loading" });
    setHighlighted(NO_HIGHLIGHT);
    setAttempt((current) => current + 1);
  }

  const rows = search.kind === "ready" ? arrange(search.results, search.query) : [];

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      handleQueryChange("");
      inputRef.current?.focus();
      return;
    }
    if (!open || rows.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) =>
        current <= 0 ? rows.length - 1 : current - 1,
      );
    } else if (event.key === "Enter") {
      const row = rows[highlighted];
      if (row === undefined) return;
      event.preventDefault();
      toggle(row.token);
    }
  }

  return (
    <div className="w-full">
      <div ref={searchRef} className="mb-4" onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search by symbol, name, or mint"
          aria-label="Search tokens"
          className="w-full rounded-md border border-edge bg-ground px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-muted focus:outline-none"
        />
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
              onRetry={handleRetry}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 pb-4 text-xs">
        {undo === null ? (
          <span className={error === null ? "text-muted" : "text-down"}>
            {error ??
              (updatedAt === null ? " " : `Updated ${updatedAt.toLocaleTimeString("en-US")}`)}
          </span>
        ) : (
          <span role="status" className="text-muted">
            Removed {undo.entry.symbol} · {" "}
            <button
              type="button"
              onClick={restore}
              className="font-medium text-ink underline decoration-edge underline-offset-2 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
            >
              Undo
            </button>
          </span>
        )}
        <button
          type="button"
          onClick={() => void refresh(watchlist.map((entry) => entry.mint))}
          disabled={isRefreshing}
          className="shrink-0 rounded-md border border-edge px-3 py-1.5 font-medium text-ink transition-colors hover:bg-edge disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {entries === null ? null : entries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-base font-medium text-ink">Start your watchlist</p>
          <p className="mt-1.5 text-sm text-muted">
            Search above by symbol, name, or mint to add your first token.
          </p>
        </div>
      ) : (
        <TokenTable entries={entries} metrics={metrics} onRemove={remove} />
      )}
    </div>
  );
}
