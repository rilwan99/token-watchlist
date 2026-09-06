"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWatchlist, searchTokens } from "@/app/lib/api";
import { loadMints } from "@/app/lib/storage";
import SearchResults, { MIN_QUERY, type SearchState } from "@/app/search-results";
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
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Debounced search. The cleanup both cancels a pending keystroke and aborts an in-flight
  // request, so the last query typed is always the one that renders.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // Keep the previous results on screen while refetching; only the first query shows a spinner.
      setSearch((current) =>
        current.kind === "ready" ? { ...current, stale: true } : { kind: "loading" },
      );
      try {
        const results = await searchTokens(trimmed, controller.signal);
        setSearch({ kind: "ready", results, stale: false });
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
  }, [query]);

  // Dismiss the results panel on an outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const root = searchRef.current;
      if (root !== null && !root.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Derived, not stored: below the minimum length there is nothing to show, whatever the
  // last completed search left in state.
  const visibleSearch: SearchState =
    query.trim().length < MIN_QUERY ? { kind: "idle" } : search;

  return (
    <div className="w-full">
      <div ref={searchRef} className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search by symbol, name, or mint"
          aria-label="Search tokens"
          className="w-full rounded-md border border-edge bg-ground px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-muted focus:outline-none"
        />
        {/* The results slot takes real space rather than floating, so it never covers the
            watchlist. Its height is fixed while open, so the page moves once on focus and
            not again as results arrive or change count. */}
        <div
          className={`overflow-hidden transition-[height] duration-200 ease-out ${
            open ? "h-104" : "h-0"
          }`}
        >
          <SearchResults state={visibleSearch} query={query} />
        </div>
      </div>

      <div className="flex items-center justify-between pb-4 text-xs text-muted">
        <span>
          {updatedAt === null
            ? "\u00a0"
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
