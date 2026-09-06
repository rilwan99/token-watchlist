"use client";

import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import {
  formatCompactUsd,
  formatCount,
  formatPercent,
  formatPrice,
  isThinLiquidity,
} from "@/app/lib/format";
import type { Timeframe, Token, WatchEntry } from "@/app/lib/types";

/** The desktop-only table row; its market columns remain visible at wider widths. */
export default function TokenRow({
  entry,
  token,
  timeframe,
  onRemove,
}: {
  entry: WatchEntry;
  token: Token | null;
  timeframe: Timeframe;
  onRemove: () => void;
}) {
  const symbol = token?.symbol || entry.symbol;
  const name = token?.name || entry.name;
  const icon = token?.icon ?? entry.icon;
  const change = token?.stats[timeframe].priceChange ?? null;
  const changeColor = change === null ? "text-muted" : change < 0 ? "text-down" : "text-up";
  const thin = isThinLiquidity(token?.liquidity ?? null);

  return (
    <tr className="group">
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
            <TokenStatus isVerified={token.isVerified} launchpad={token.launchpad} />
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
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${symbol} from watchlist`}
            className="flex size-8 items-center justify-center rounded-md text-xl leading-none text-muted opacity-0 transition-[color,opacity] hover:text-down focus-visible:text-down focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
