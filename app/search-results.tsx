"use client";

import { useState } from "react";
import { formatCompactUsd, formatMint } from "@/app/lib/format";
import type { OrganicScoreLabel, Token, TokenStats } from "@/app/lib/types";

// A union rather than parallel useStates: results and an error can never render together.
// `stale` marks results still on screen while a newer query is in flight. `query` is the
// one that produced these results, not the live input - during the debounce the two differ,
// and both the no-match message and the exact-match pin must name what was actually searched.
export type SearchState =
  | { kind: "loading" }
  | { kind: "ready"; query: string; results: Token[]; stale: boolean }
  | { kind: "error"; message: string };

// In normal flow inside the slot above, not floating: the slot already reserves the space.
// Every state fills that slot rather than sizing to its content - a one-row message in a
// 416px slot reads as a gap between the panel and the watchlist, and the gap moving around
// as states change is the thing the fixed slot exists to prevent.
const PANEL = "flex min-h-0 flex-1 flex-col rounded-md border border-edge bg-ground";

// Loading, no-match and failure have little to say, so they say it in the middle of the
// panel rather than pinned to the top above 350px of nothing.
const CENTERED = `${PANEL} items-center justify-center gap-3 px-6 text-center`;

// The list scrolls inside the panel instead of growing it.
const SCROLLER = "min-h-0 flex-1 divide-y divide-edge";

// Enough skeleton rows to overrun the panel, so the last one clips exactly as a real
// scrolling result list does.
const SKELETON_ROWS = 8;

// Below this, liquidity renders in the danger color: a token nobody can exit is a worse
// trap than an unverified one.
const LOW_LIQUIDITY_USD = 10_000;

// Base58 omits 0, O, I and l. Solana mints are 32-44 characters.
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// One template shared by the header and every row, so the two can never drift apart.
// Columns drop right to left as width shrinks - organic, then liquidity, then volume -
// leaving market cap last. Below 480px the grid collapses to identity alone and the
// metrics move to an inline line under the name.
const GRID =
  "grid items-center gap-2 grid-cols-[minmax(0,1fr)]" +
  " min-[480px]:grid-cols-[minmax(0,1fr)_74px]" +
  " min-[560px]:grid-cols-[minmax(0,1fr)_74px_74px]" +
  " min-[640px]:grid-cols-[minmax(0,1fr)_74px_74px_13px_70px]" +
  " min-[720px]:grid-cols-[minmax(0,1fr)_74px_74px_13px_70px_56px]";
const CELL_MCAP = "hidden text-right tabular-nums min-[480px]:block";
const CELL_VOLUME = "hidden text-right tabular-nums min-[560px]:block";
const CELL_RULE = "hidden justify-center min-[640px]:flex";
const CELL_LIQUIDITY = "hidden text-right tabular-nums min-[640px]:block";
const CELL_ORGANIC = "hidden items-center justify-end gap-1.5 min-[720px]:flex";

// Jupiter reports the two sides separately and never a total. A token can legitimately
// have buys and no sells, so only a missing pair reads as unknown.
function volume24h(stats: TokenStats): number | null {
  if (stats.buyVolume === null && stats.sellVolume === null) return null;
  return (stats.buyVolume ?? 0) + (stats.sellVolume ?? 0);
}

/**
 * Pins the exact symbol match to the top and leaves everything else in Jupiter's order.
 *
 * Jupiter already ranks by verification, liquidity and organic score. Checked against the
 * live API on 2026-09-06: `USDC`, `BONK`, `JUP` and `TRUMP` each returned the real token
 * first and the impersonators last - the two tokens literally named `USDC` land at 7 and 8.
 * Re-grouping on a coarser verified-and-liquid rule only moved rows the wrong way, demoting
 * verified `DJTx` below a divider that called it unverified.
 *
 * The pin is suppressed when several unverified tokens share the typed symbol: `BONKGUY`
 * returns three, and decorating one as the match is a claim nothing here can support. A
 * verified match settles it whenever there is one.
 */
function arrange(results: Token[], query: string) {
  const symbol = query.trim().toLowerCase();
  const exact = results.filter((token) => token.symbol.toLowerCase() === symbol);
  const pinned =
    exact.find((token) => token.isVerified) ??
    (exact.length === 1 ? exact[0] : null) ??
    null;
  return { pinned, rest: results.filter((token) => token !== pinned) };
}

/**
 * Renders the four panel states. There is no state for an empty field: the panel is closed
 * below one character, so this only ever renders against a query the user has typed.
 */
export default function SearchResults({
  state,
  watchlist,
  onRetry,
}: {
  state: SearchState;
  watchlist: Set<string>;
  onRetry: () => void;
}) {
  // Only reached before the first result of a session lands. Once a query has returned
  // rows they stay on screen, dimmed, rather than flashing back through this. Skeleton rows
  // carry the shape of what is coming, so nothing shifts when it arrives; they are scenery,
  // hidden from assistive tech in favour of the status message.
  if (state.kind === "loading") {
    return (
      <div role="status" className={PANEL}>
        <span className="sr-only">Searching...</span>
        <ul aria-hidden="true" className={`${SCROLLER} overflow-hidden`}>
          <ResultsHeader />
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </ul>
      </div>
    );
  }

  // Deliberately unlike the no-match copy: nothing was searched, so nothing was ruled out.
  if (state.kind === "error") {
    return (
      <div role="status" className={CENTERED}>
        <div>
          <p className="text-sm text-down">Search couldn&apos;t be reached.</p>
          <p className="mt-1 text-xs text-muted">{state.message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-edge"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.results.length === 0) {
    return (
      <div
        role="status"
        className={`${CENTERED} transition-opacity ${state.stale ? "opacity-50" : "opacity-100"}`}
      >
        <div className="max-w-full">
          <p className="truncate text-sm text-ink">
            No tokens match &ldquo;{state.query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted">
            Try a symbol, a name, or paste a mint address.
          </p>
        </div>
      </div>
    );
  }

  const { pinned, rest } = arrange(state.results, state.query);
  // A base58 query means the user pasted a mint, so every row shows the address in place
  // of the name rather than waiting for a hover.
  const addressQuery = BASE58_MINT.test(state.query);

  return (
    <div
      className={`${PANEL} overflow-hidden transition-opacity ${
        state.stale ? "opacity-50" : "opacity-100"
      }`}
    >
      <ul aria-label="Search results" className={`${SCROLLER} overflow-y-auto`}>
        <ResultsHeader />
        {pinned === null ? null : (
          <SearchRow
            key={pinned.id}
            token={pinned}
            addressQuery={addressQuery}
            onWatchlist={watchlist.has(pinned.id)}
            exact
          />
        )}
        {rest.map((token) => (
          <SearchRow
            key={token.id}
            token={token}
            addressQuery={addressQuery}
            onWatchlist={watchlist.has(token.id)}
            exact={false}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * The units live here so rows stop repeating "Liq" and "Organic" on every line. It sits
 * inside the scroll container rather than above it: outside, the scrollbar narrows the rows
 * and every value lands ~15px left of its own label. Sticky keeps it in view; the shadow
 * draws its rule outside the box, so it lands on the same pixel as the first row's divider
 * instead of doubling it. Below 480px there are no columns left to label, so it goes.
 * Presentational text - it must not take a tab stop.
 */
function ResultsHeader() {
  return (
    <li
      role="presentation"
      className={`${GRID} sticky top-0 z-10 border-l-2 border-transparent bg-ground px-3 py-1.5 text-[11px] text-muted shadow-[0_1px_0_var(--color-edge)] max-[479px]:hidden`}
    >
      <span />
      <span className={CELL_MCAP}>Market cap</span>
      <span className={CELL_VOLUME}>Vol 24h</span>
      <span className={CELL_RULE} />
      <span className={CELL_LIQUIDITY}>Liquidity</span>
      <span className={CELL_ORGANIC}>Organic</span>
    </li>
  );
}

/**
 * A result row with the data taken out. It reuses GRID and the same cell classes as the real
 * row, and pins the 53px row height a real row measures, so results landing swap content
 * without moving a column or a row edge.
 */
function SkeletonRow() {
  return (
    <li
      className={`${GRID} h-[53px] animate-pulse border-l-2 border-transparent px-3 motion-reduce:animate-none`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-7 shrink-0 rounded-full bg-edge" />
        <div className="min-w-0 flex-1">
          <span className="block h-3 w-14 rounded bg-edge" />
          <span className="mt-1.5 block h-2.5 w-24 rounded bg-edge/60" />
        </div>
      </div>
      <span className={CELL_MCAP}>
        <span className="ml-auto block h-3 w-11 rounded bg-edge" />
      </span>
      <span className={CELL_VOLUME}>
        <span className="ml-auto block h-3 w-11 rounded bg-edge" />
      </span>
      <span className={CELL_RULE}>
        <span className="h-[22px] w-px bg-edge" />
      </span>
      <span className={CELL_LIQUIDITY}>
        <span className="ml-auto block h-3 w-10 rounded bg-edge/60" />
      </span>
      <span className={CELL_ORGANIC}>
        <span className="h-1 w-[26px] shrink-0 rounded-full bg-edge" />
        <span className="h-3 w-4 rounded bg-edge/60" />
      </span>
    </li>
  );
}

const ORGANIC_BAR: Record<OrganicScoreLabel, string> = {
  high: "bg-up",
  medium: "bg-ink",
  low: "bg-muted",
};

/**
 * One result. Same-symbol impersonators are the failure mode this list guards against, and
 * the row carries that itself rather than the list re-grouping around it: an unverified
 * token reads recessive - dimmed icon, muted symbol, a `?` where the verified check sits,
 * launch origin - and liquidity takes the danger color once it drops under the threshold.
 */
function SearchRow({
  token,
  addressQuery,
  onWatchlist,
  exact,
}: {
  token: Token;
  addressQuery: boolean;
  onWatchlist: boolean;
  exact: boolean;
}) {
  const [iconBroken, setIconBroken] = useState(false);
  const [copied, setCopied] = useState(false);

  const volume = volume24h(token.stats["24h"]);
  const thin = token.liquidity !== null && token.liquidity < LOW_LIQUIDITY_USD;
  const organic = token.organicScore === null ? null : Math.round(token.organicScore);

  // The pin answers "is this what you typed", not "is this safe". On an unverified match the
  // accent would read as endorsement the row cannot back, so only a verified pin gets it;
  // an unverified one keeps the position and the tag in neutral ink.
  const endorsed = exact && token.isVerified;

  // The two layers swap by opacity rather than display, because the copy button has to stay
  // in the tab order while hidden - reaching it by keyboard is what reveals the address.
  const nameLayer = addressQuery
    ? "opacity-0"
    : "opacity-100 group-hover:opacity-0 group-focus-within:opacity-0";
  const addressLayer = addressQuery
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";

  function handleCopy() {
    navigator.clipboard.writeText(token.id).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      // Clipboard access denied: the address is on screen and selectable, so there is
      // nothing to tell the user they cannot already do.
      () => undefined,
    );
  }

  return (
    <li
      className={`group ${GRID} border-l-2 px-3 py-2 text-sm ${
        endorsed ? "border-accent bg-accent/5" : exact ? "border-muted" : "border-transparent"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {token.icon === null || iconBroken ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-edge text-xs text-muted">
            ?
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
          <img
            src={token.icon}
            alt=""
            onError={() => setIconBroken(true)}
            className={`size-7 shrink-0 rounded-full ${token.isVerified ? "" : "opacity-40"}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`truncate font-medium ${token.isVerified ? "text-ink" : "text-muted"}`}
            >
              {token.symbol}
            </span>
            {/* Both states render into this one fixed-width slot, so nothing after it moves
                between rows. Unverified gets a glyph of its own rather than an empty slot:
                the row's most important fact should not be carried by an absence. */}
            <span
              className={`w-3 shrink-0 text-center ${token.isVerified ? "text-up" : "text-muted"}`}
            >
              {token.isVerified ? "✓" : "?"}
              <span className="sr-only">
                {token.isVerified ? "Verified" : "Unverified"}
              </span>
            </span>
            {token.isVerified || token.launchpad === null ? null : (
              <span className="shrink-0 rounded border border-edge px-1 text-[10px] text-muted">
                {token.launchpad}
              </span>
            )}
            {exact ? (
              <span
                className={`shrink-0 rounded border px-1 text-[10px] ${
                  endorsed ? "border-accent/40 text-accent" : "border-edge text-muted"
                }`}
              >
                Exact
              </span>
            ) : null}
            {/* A short watchlist sits entirely behind the open panel, so the row has to say
                this itself rather than leaving the user to check the table. */}
            {onWatchlist ? (
              <span className="shrink-0 rounded border border-edge bg-edge px-1 text-[10px] text-ink">
                On list
              </span>
            ) : null}
          </div>

          <div className="relative h-4 text-xs">
            <span className={`absolute inset-0 truncate text-muted transition-opacity ${nameLayer}`}>
              {token.name}
            </span>
            <span className={`absolute inset-0 flex items-center gap-1 transition-opacity ${addressLayer}`}>
              <span className="font-mono text-muted">{formatMint(token.id)}</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy the ${token.symbol} mint address`}
                className="rounded px-0.5 text-muted hover:text-ink focus-visible:text-ink focus-visible:outline-none"
              >
                {copied ? "✓" : "⧉"}
              </button>
            </span>
          </div>

          {/* Under 480px the grid is gone, so the metrics ride along under the name. */}
          <p className="truncate text-xs text-muted min-[480px]:hidden">
            MC {formatCompactUsd(token.mcap)}, Vol {formatCompactUsd(volume)},{" "}
            <span className={thin ? "text-down" : undefined}>
              Liq {formatCompactUsd(token.liquidity)}
            </span>
            , Organic {organic ?? "—"}
          </p>
        </div>
      </div>

      <span className={`${CELL_MCAP} text-ink`}>{formatCompactUsd(token.mcap)}</span>
      <span className={`${CELL_VOLUME} text-ink`}>{formatCompactUsd(volume)}</span>
      <span className={CELL_RULE}>
        <span className="h-[22px] w-px bg-edge" />
      </span>
      <span className={`${CELL_LIQUIDITY} ${thin ? "text-down" : "text-muted"}`}>
        {formatCompactUsd(token.liquidity)}
      </span>
      <span className={CELL_ORGANIC}>
        {organic === null ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <span className="h-1 w-[26px] shrink-0 overflow-hidden rounded-full bg-edge">
              <span
                className={`block h-full rounded-full ${
                  token.organicScoreLabel === null
                    ? "bg-muted"
                    : ORGANIC_BAR[token.organicScoreLabel]
                }`}
                style={{ width: `${Math.min(100, Math.max(0, organic))}%` }}
              />
            </span>
            <span className="tabular-nums text-muted">{organic}</span>
          </>
        )}
      </span>
    </li>
  );
}
