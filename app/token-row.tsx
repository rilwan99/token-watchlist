"use client";

import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import WarningTriangle from "@/components/warning-triangle";
import {
  changeTone,
  formatCompactUsd,
  formatChange,
  formatCount,
  formatPriceCompact,
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
  const changeColor = {
    up: "text-up",
    down: "text-down",
    flat: "text-faint",
  }[changeTone(change)];
  const thin = isThinLiquidity(token?.liquidity ?? null);

  return (
    <tr className="group transition-colors hover:bg-raised">
      <td className="min-w-0 py-[11px] pl-4 pr-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
          <TokenIcon
            src={icon}
            symbol={symbol}
            className="size-[22px]"
            dimmed={token !== null && !token.isVerified}
          />
          <span className="shrink-0 font-medium text-ink">{symbol}</span>
          {token === null ? null : (
            <TokenStatus isVerified={token.isVerified} launchpad={token.launchpad} />
          )}
          </div>
          <span className="mt-0.5 block truncate pl-[30px] text-xs text-muted">{name}</span>
        </div>
      </td>
      <td className="px-2 py-[11px] text-right tabular-nums text-ink">
        {formatPriceCompact(token?.usdPrice ?? null)}
      </td>
      <td className={`px-2 py-[11px] text-right tabular-nums ${changeColor}`}>
        {formatChange(change)}
      </td>
      <td className="px-2 py-[11px] text-right tabular-nums text-muted">
        {formatCompactUsd(token?.mcap ?? null)}
      </td>
      <td className="px-2 py-[11px] text-right tabular-nums text-muted">
        <span className="inline-flex items-center justify-end gap-1">
          {thin ? <WarningTriangle /> : null}
          {formatCompactUsd(token?.liquidity ?? null)}
        </span>
      </td>
      <td className="px-2 py-[11px] text-right tabular-nums text-muted">
        {formatCount(token?.holderCount ?? null)}
      </td>
      <td className="py-[11px] pr-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${symbol} from watchlist`}
            className="flex size-7 items-center justify-center rounded-md text-xl leading-none text-faint opacity-0 transition-[color,opacity] hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover:opacity-100 group-focus-within:opacity-100"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
