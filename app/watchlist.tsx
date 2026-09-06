"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWatchlist, searchTokens } from "@/app/lib/api";
import { loadMints } from "@/app/lib/storage";
import {
  formatCompactUsd,
  formatCount,
  formatMint,
  formatPercent,
  formatPrice,
} from "@/app/lib/format";
import type { Timeframe, Token } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

type Status = "loading" | "ready" | "error";

// A union rather than parallel useStates: results and an error can never render together.
// `stale` marks results still on screen while a newer query is in flight.
type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; results: Token[]; stale: boolean }
  | { kind: "error"; message: string };

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
            open ? "h-84" : "h-0"
          }`}
        >
          <SearchResults state={visibleSearch} />
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

// In normal flow inside the slot above, not floating: the slot already reserves the space.
const PANEL = "mt-1 rounded-md border border-edge bg-ground";

// Renders the search states. Idle is a hint rather than nothing, so focusing the input
// doesn't open an empty void.
function SearchResults({ state }: { state: SearchState }) {
  if (state.kind === "idle") {
    return (
      <p className={`${PANEL} px-3 py-2 text-sm text-muted`}>
        Type at least {MIN_QUERY} characters to search by symbol, name, or mint.
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <p role="status" className={`${PANEL} px-3 py-2 text-sm text-muted`}>
        Searching...
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p role="status" className={`${PANEL} px-3 py-2 text-sm text-down`}>
        {state.message}
      </p>
    );
  }

  if (state.results.length === 0) {
    return (
      <p role="status" className={`${PANEL} px-3 py-2 text-sm text-muted`}>
        No tokens matched that search.
      </p>
    );
  }

  return (
    <ul
      className={`${PANEL} max-h-80 divide-y divide-edge overflow-y-auto transition-opacity ${
        state.stale ? "opacity-50" : "opacity-100"
      }`}
    >
      {state.results.map((token) => (
        <SearchRow key={token.id} token={token} />
      ))}
    </ul>
  );
}

// Same-symbol impersonators are the failure mode this list has to guard against, so an
// unverified token is rendered recessive: dimmed icon, muted symbol, an explicit label.
function SearchRow({ token }: { token: Token }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      {token.icon === null ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
        <img
          src={token.icon}
          alt=""
          className={`size-6 shrink-0 rounded-full ${token.isVerified ? "" : "opacity-40"}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={token.isVerified ? "font-medium text-ink" : "text-muted"}>
            {token.symbol}
          </span>
          {token.isVerified ? (
            <span className="text-xs text-up" title="Verified">✓</span>
          ) : (
            <span className="rounded border border-edge px-1 text-[10px] uppercase tracking-wide text-muted">
              unverified
            </span>
          )}
          <span className="truncate text-muted">{token.name}</span>
        </div>
        <div className="flex gap-3 text-xs text-muted">
          <span className="tabular-nums">{formatMint(token.id)}</span>
          <span>Liq {formatCompactUsd(token.liquidity)}</span>
          <span>
            Organic {token.organicScore === null ? "-" : Math.round(token.organicScore)}
          </span>
        </div>
      </div>
    </li>
  );
}

function TokenTable({ tokens }: { tokens: Token[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="py-3 pr-4 font-medium">Token</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">{TIMEFRAME}</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Market cap</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Liquidity</th>
            <th scope="col" className="py-3 text-right font-medium">Holders</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {tokens.map((token) => {
            const change = token.stats[TIMEFRAME].priceChange;
            const changeColor =
              change === null ? "text-muted" : change < 0 ? "text-down" : "text-up";
            return (
              <tr key={token.id}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {token.icon === null ? null : (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
                      <img src={token.icon} alt="" className="size-5 rounded-full" />
                    )}
                    <span className="font-medium text-ink">{token.symbol}</span>
                    <span className="text-muted">{token.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink">
                  {formatPrice(token.usdPrice)}
                </td>
                <td className={`py-3 pr-4 text-right tabular-nums ${changeColor}`}>
                  {formatPercent(change)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {formatCompactUsd(token.mcap)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {formatCompactUsd(token.liquidity)}
                </td>
                <td className="py-3 text-right tabular-nums text-muted">
                  {formatCount(token.holderCount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
