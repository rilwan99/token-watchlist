"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWatchlist, searchTokens } from "@/app/lib/api";
import { loadMints } from "@/app/lib/storage";
import SearchResults, { type SearchState } from "@/app/search-results";
import TokenTable from "@/app/token-table";
import type { Token } from "@/app/lib/types";

const DEBOUNCE_MS = 250;

type Status = "loading" | "ready" | "error";

export default function Watchlist() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "loading" });
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Loads the saved watchlist, fetches fresh market data, and updates the load state.
  // Memoized with useCallback to keep a stable function reference
  const load = useCallback(async () => {
    try {
      const next = await fetchWatchlist(loadMints());
      setTokens(next);
      setUpdatedAt(new Date());
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load token data.");
      setStatus("error");
    }
  }, []);

  // Loads the persisted watchlist after mount (avoids a hydration mismatch)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the mint list lives in localStorage, readable only after mount
    void load();
  }, [load]);

  function handleRefresh() {
    setStatus("loading");
    void load();
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
  // emptying the field closes it. Escape and an outside click dismiss it without clearing
  // the query, and the next keystroke brings it back.
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
    // Clearing the field discards the last result, so reopening never flashes a stale one.
    if (next.trim() === "") setSearch({ kind: "loading" });
  }

  function handleRetry() {
    setSearch({ kind: "loading" });
    setAttempt((current) => current + 1);
  }

  // Rendered rows are the watchlist, so the panel's badge follows whatever the table shows.
  const watchlist = new Set(tokens.map((token) => token.id));

  return (
    <div className="w-full">
      {/* Escape is handled here rather than on the input so it also reaches the panel's own
          tab stops - the copy buttons and Retry. Those go inert as the panel closes, so
          focus has to come back to the input or it is left on nothing. */}
      <div
        ref={searchRef}
        className="mb-4"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          setDismissed(true);
          inputRef.current?.focus();
        }}
      >
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
            <SearchResults state={search} watchlist={watchlist} onRetry={handleRetry} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pb-4 text-xs text-muted">
        <span>
          {updatedAt === null
            ? " "
            : `Updated ${updatedAt.toLocaleTimeString("en-US")}`}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={status === "loading"}
          className="rounded-md border border-edge px-3 py-1.5 font-medium text-ink transition-colors hover:bg-edge disabled:opacity-50"
        >
          {status === "loading" ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {status === "error" ? (
        <p className="py-12 text-center text-sm text-down">{error}</p>
      ) : status === "loading" && tokens.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Loading...</p>
      ) : tokens.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          Your watchlist is empty. Search for a token to add one.
        </p>
      ) : (
        <TokenTable tokens={tokens} />
      )}
    </div>
  );
}
