"use client";

import StarButton from "@/app/star-button";
import TokenIcon from "@/app/token-icon";
import {
  formatCompactUsd,
  formatCount,
  formatPercent,
  formatPrice,
  isThinLiquidity,
} from "@/app/lib/format";
import type { Timeframe, Token, WatchEntry } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";

/**
 * Rows come from the stored entries, values from the live fetch keyed by mint. They are kept
 * apart on purpose: a mint Jupiter stops answering for keeps its row and its name, with
 * dashes down the numeric columns, rather than disappearing out from under someone who
 * deliberately saved it. Same on reload, for the moment before the fetch lands.
 */
export default function TokenTable({
  entries,
  metrics,
  onRemove,
}: {
  entries: WatchEntry[];
  metrics: Map<string, Token>;
  onRemove: (mint: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        {/* `whitespace-nowrap`: the identity column below takes every spare pixel, which
            otherwise wraps "Market cap" onto two lines and drags the header row taller. */}
        <thead className="whitespace-nowrap border-b border-edge text-xs uppercase tracking-wide text-muted">
          <tr>
            {/* `w-full max-w-0` lets this column absorb the slack and lets a long name
                truncate inside it, instead of widening the table and shoving the numbers
                off the right edge. */}
            <th scope="col" className="w-full max-w-0 py-3 pr-4 font-medium">Token</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">{TIMEFRAME}</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Market cap</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Liquidity</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Holders</th>
            <th scope="col" className="py-3">
              <span className="sr-only">Remove from watchlist</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {entries.map((entry) => (
            <TokenRow
              key={entry.mint}
              entry={entry}
              token={metrics.get(entry.mint) ?? null}
              onRemove={() => onRemove(entry.mint)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One watchlist row. The verification and liquidity warnings are the same ones the search row
 * carries, because the reason to show them does not end at the moment of adding - the row is
 * where the token is looked at from then on. They render only when the live token is in hand:
 * absent metrics mean verification is unknown, and a `?` would state something stronger.
 */
function TokenRow({
  entry,
  token,
  onRemove,
}: {
  entry: WatchEntry;
  token: Token | null;
  onRemove: () => void;
}) {
  // Live identity wins where it exists - a token can be renamed, or saved before it was
  // verified - and the stored copy carries the row until the fetch lands.
  const symbol = token?.symbol || entry.symbol;
  const name = token?.name || entry.name;
  const icon = token?.icon ?? entry.icon;

  const change = token?.stats[TIMEFRAME].priceChange ?? null;
  const changeColor = change === null ? "text-muted" : change < 0 ? "text-down" : "text-up";
  const thin = isThinLiquidity(token?.liquidity ?? null);

  return (
    <tr>
      <td className="w-full max-w-0 py-3 pr-4">
        <div className="flex min-w-0 items-center gap-2">
          <TokenIcon
            src={icon}
            symbol={symbol}
            className="size-5"
            dimmed={token !== null && !token.isVerified}
          />
          <span className="shrink-0 font-medium text-ink">{symbol}</span>
          {token === null ? null : (
            <span
              className={`w-3 shrink-0 text-center ${token.isVerified ? "text-up" : "text-muted"}`}
            >
              {token.isVerified ? "✓" : "?"}
              <span className="sr-only">
                {token.isVerified ? "Verified" : "Unverified"}
              </span>
            </span>
          )}
          {token === null || token.isVerified || token.launchpad === null ? null : (
            <span className="shrink-0 rounded border border-edge px-1 text-[10px] text-muted">
              {token.launchpad}
            </span>
          )}
          <span className="truncate text-muted">{name}</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-ink">
        {formatPrice(token?.usdPrice ?? null)}
      </td>
      <td className={`py-3 pr-4 text-right tabular-nums ${changeColor}`}>
        {formatPercent(change)}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-muted">
        {formatCompactUsd(token?.mcap ?? null)}
      </td>
      <td className={`py-3 pr-4 text-right tabular-nums ${thin ? "text-down" : "text-muted"}`}>
        {formatCompactUsd(token?.liquidity ?? null)}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-muted">
        {formatCount(token?.holderCount ?? null)}
      </td>
      <td className="py-3">
        {/* Always filled and always visible: on this table it is the row's membership fact
            as much as its remove control, and a control that appears on hover is one a
            touch user has to guess at. One click, no confirmation - re-adding is a search
            away, and the search row will already show it as saved. */}
        <div className="flex justify-end">
          <StarButton filled symbol={symbol} onClick={onRemove} />
        </div>
      </td>
    </tr>
  );
}
