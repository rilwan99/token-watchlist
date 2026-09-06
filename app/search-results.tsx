"use client";

import { useState } from "react";
import { formatCompactUsd, formatMint } from "@/app/lib/format";
import type { OrganicScoreLabel, Token, TokenStats } from "@/app/lib/types";

export const MIN_QUERY = 2;

// A union rather than parallel useStates: results and an error can never render together.
// `stale` marks results still on screen while a newer query is in flight.
export type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; results: Token[]; stale: boolean }
  | { kind: "error"; message: string };

// In normal flow inside the slot above, not floating: the slot already reserves the space.
const PANEL = "mt-1 rounded-md border border-edge bg-ground";

// Below this, liquidity renders in the danger color and the row drops to the lower group:
// a token nobody can exit is a worse trap than an unverified one.
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

// Verified alone is not enough: Jupiter returns verified tokens with a few hundred dollars
// of liquidity. Unknown liquidity counts as thin.
function isTrusted(token: Token): boolean {
  return token.isVerified && (token.liquidity ?? 0) >= LOW_LIQUIDITY_USD;
}

/**
 * Pins the first exact symbol match to the top, then splits the rest into trusted and
 * everything else. Jupiter's ordering is preserved inside each group - it already weighs
 * organic score, and the pin is what stops the split burying the token actually typed.
 */
function arrange(results: Token[], query: string) {
  const symbol = query.trim().toLowerCase();
  const pinIndex = results.findIndex((token) => token.symbol.toLowerCase() === symbol);
  const pinned = pinIndex === -1 ? null : (results[pinIndex] ?? null);
  const rest = results.filter((_, index) => index !== pinIndex);
  return {
    pinned,
    trusted: rest.filter(isTrusted),
    untrusted: rest.filter((token) => !isTrusted(token)),
  };
}

// Renders the search states. Idle is a hint rather than nothing, so focusing the input
// doesn't open an empty void.
export default function SearchResults({
  state,
  query,
}: {
  state: SearchState;
  query: string;
}) {
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

  const { pinned, trusted, untrusted } = arrange(state.results, query);
  // A base58 query means the user pasted a mint, so every row shows the address in place
  // of the name rather than waiting for a hover.
  const addressQuery = BASE58_MINT.test(query.trim());

  return (
    <div
      className={`${PANEL} overflow-hidden transition-opacity ${
        state.stale ? "opacity-50" : "opacity-100"
      }`}
    >
      <ul aria-label="Search results" className="max-h-100 divide-y divide-edge overflow-y-auto">
        <ResultsHeader />
        {pinned === null ? null : (
          <SearchRow key={pinned.id} token={pinned} addressQuery={addressQuery} exact />
        )}
        {trusted.map((token) => (
          <SearchRow
            key={token.id}
            token={token}
            addressQuery={addressQuery}
            exact={false}
          />
        ))}
        {untrusted.length === 0 ? null : (
          <li
            role="presentation"
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-muted"
          >
            <span aria-hidden="true">⚠</span>
            Unverified · low liquidity
          </li>
        )}
        {untrusted.map((token) => (
          <SearchRow
            key={token.id}
            token={token}
            addressQuery={addressQuery}
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

const ORGANIC_BAR: Record<OrganicScoreLabel, string> = {
  high: "bg-up",
  medium: "bg-ink",
  low: "bg-muted",
};

/**
 * One result. Same-symbol impersonators are the failure mode this list guards against, so
 * an unverified token is rendered recessive - dimmed icon, muted symbol, launch origin -
 * and liquidity carries the danger color once it drops under the threshold.
 */
function SearchRow({
  token,
  addressQuery,
  exact,
}: {
  token: Token;
  addressQuery: boolean;
  exact: boolean;
}) {
  const [iconBroken, setIconBroken] = useState(false);
  const [copied, setCopied] = useState(false);

  const volume = volume24h(token.stats["24h"]);
  const thin = token.liquidity !== null && token.liquidity < LOW_LIQUIDITY_USD;
  const organic = token.organicScore === null ? null : Math.round(token.organicScore);

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
        exact ? "border-accent bg-accent/5" : "border-transparent"
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
            {/* Fixed width whether or not the check renders, so nothing after it moves. */}
            <span className="w-3 shrink-0 text-center text-up">
              {token.isVerified ? (
                <>
                  ✓<span className="sr-only">Verified</span>
                </>
              ) : null}
            </span>
            {token.isVerified || token.launchpad === null ? null : (
              <span className="shrink-0 rounded border border-edge px-1 text-[10px] text-muted">
                {token.launchpad}
              </span>
            )}
            {exact ? (
              <span className="shrink-0 rounded border border-accent/40 px-1 text-[10px] text-accent">
                Exact
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
