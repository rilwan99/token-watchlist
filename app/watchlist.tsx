"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokens, searchTokens } from "@/app/lib/api";
import { loadEntries, saveEntries, toWatchEntry } from "@/app/lib/storage";
import SearchResults, { arrange, type SearchState } from "@/app/search-results";
import TokenTable from "@/app/token-table";
import type { Token, WatchEntry } from "@/app/lib/types";

const DEBOUNCE_MS = 250;

// No row is highlighted until an arrow key asks for one, so Enter on a fresh search does
// nothing rather than adding whatever happens to be first.
const NO_HIGHLIGHT = -1;

type Status = "loading" | "ready" | "error";

export default function Watchlist() {
  // The one source of truth for membership: an ordered list of mint-keyed identities, and
  // the only thing that is persisted. Both the table and the panel's stars read from it, so
  // there is nothing to keep in sync. `null` means storage has not been read yet, which is
  // not the same fact as an empty watchlist and must not render as one.
  const [entries, setEntries] = useState<WatchEntry[] | null>(null);
  // Live market data, keyed by mint, never persisted and never a membership list. Replaced
  // wholesale on every refresh, so a token Jupiter stops returning falls back to dashes
  // instead of keeping numbers that are quietly older than the timestamp beside them.
  const [metrics, setMetrics] = useState<Map<string, Token>>(new Map());

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "loading" });
  const [highlighted, setHighlighted] = useState(NO_HIGHLIGHT);
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const watchlist = entries ?? [];
  const watched = new Set(watchlist.map((entry) => entry.mint));

  // Fetches market data for the given mints in one batch. It takes the mints rather than
  // reading state so a refresh that overlaps an add or a remove asks for the list as it was
  // at the click - and since rows render from `entries`, a late response can neither
  // resurrect a removed token nor drop a new one.
  const refresh = useCallback(async (mints: string[]) => {
    setStatus("loading");
    try {
      const tokens = await fetchTokens(mints);
      setMetrics(new Map(tokens.map((token) => [token.id, token])));
      setUpdatedAt(new Date());
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load token data.");
      setStatus("error");
    }
  }, []);

  // Storage is readable only after mount, so the rows paint from it on the first commit and
  // the numbers arrive after. Nothing waits on the network to know what is on the list.
  useEffect(() => {
    const stored = loadEntries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setEntries(stored);
    void refresh(stored.map((entry) => entry.mint));
  }, [refresh]);

  // Written at the point of change rather than in an effect on `entries`: an effect would
  // also fire for the mount that reads storage, writing back what it just read.
  function commit(next: WatchEntry[]) {
    setEntries(next);
    saveEntries(next);
  }

  /**
   * The star on a search row. Membership is decided by mint - symbols collide, and three
   * different tokens answer to `BONKGUY`. Adding reuses the token search already returned,
   * so the row is complete before the next refresh; there is no second fetch and nothing to
   * wait for. Two fast clicks resolve to add-then-remove or, if they land in one batch and
   * both read the same state, to a single add: the membership test guards the append, so no
   * sequence of clicks can produce two rows for one mint.
   */
  function toggle(token: Token) {
    if (watched.has(token.id)) {
      commit(watchlist.filter((entry) => entry.mint !== token.id));
      return;
    }
    commit([...watchlist, toWatchEntry(token)]);
    setMetrics((current) => new Map(current).set(token.id, token));
  }

  function remove(mint: string) {
    commit(watchlist.filter((entry) => entry.mint !== mint));
  }

  // Debounced search. `attempt` re-runs the same query for the error state's retry.
  // The cleanup both cancels a pending keystroke and aborts an in-flight request, so the
  // last query typed is always the one that renders.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // A settled answer stays on screen, dimmed, while a newer query loads - and "no tokens
      // match" is as much an answer as a list of rows, so it is held too rather than torn
      // down to a skeleton on every keystroke. It names the query it came from, so holding
      // it stays true. A failure is not an answer and does not persist: its Retry would sit
      // there live, inviting a second request while one is already in flight.
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

  // The panel is driven by the field's contents, not by focus: one character opens it and
  // emptying the field closes it. An outside click dismisses it without clearing the query,
  // and the next keystroke brings it back.
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
    // Clearing the field discards the last result, so reopening never flashes a stale one.
    if (next.trim() === "") setSearch({ kind: "loading" });
  }

  function handleRetry() {
    setSearch({ kind: "loading" });
    setHighlighted(NO_HIGHLIGHT);
    setAttempt((current) => current + 1);
  }

  // The rows the panel renders, in the order it renders them. Computed here rather than
  // inside the panel because the arrow keys index into this list and the key handler lives
  // up here with the input.
  const rows = search.kind === "ready" ? arrange(search.results, search.query) : [];

  /**
   * Keys are handled on the wrapper rather than the input so they also reach the panel's own
   * tab stops - the stars, the copy buttons, Retry. Escape empties the field, which closes
   * the panel through `open`; the tab stops inside go `inert` as it closes, so focus has to
   * come back to the input or it is left on nothing.
   *
   * Enter toggles and stops there. The panel stays open and the query stays put, because one
   * search is usually worth more than one token.
   */
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
        {/* The results slot takes real space rather than floating, so it never covers the
            watchlist. Its height is the cap whenever the panel is open, so the page moves
            once on the first character and not again as results arrive or change count.
            The panel inside fills the slot in every state, so no state leaves a gap between
            it and the watchlist. `inert` keeps the collapsed panel out of the tab order. */}
        <div
          inert={!open}
          className={`overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none ${
            open ? "h-104" : "h-0"
          }`}
        >
          <div className="flex h-full flex-col pt-1">
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

      {/* The rows are already on screen, so a failed fetch reports itself here beside the
          age it failed to update rather than replacing a table that is still readable. */}
      <div className="flex items-start justify-between gap-4 pb-4 text-xs">
        <span className={error === null ? "text-muted" : "text-down"}>
          {error ??
            (updatedAt === null ? " " : `Updated ${updatedAt.toLocaleTimeString("en-US")}`)}
        </span>
        <button
          type="button"
          onClick={() => void refresh(watchlist.map((entry) => entry.mint))}
          disabled={status === "loading"}
          className="shrink-0 rounded-md border border-edge px-3 py-1.5 font-medium text-ink transition-colors hover:bg-edge disabled:opacity-50"
        >
          {status === "loading" ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {entries === null ? null : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          Your watchlist is empty. Search above to add a token.
        </p>
      ) : (
        <TokenTable entries={entries} metrics={metrics} onRemove={remove} />
      )}
    </div>
  );
}
