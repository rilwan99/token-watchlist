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
import type { Token, WatchEntry } from "@/app/lib/types";

/** The desktop-only table row; its market columns remain visible at wider widths. */
export default function TokenRow({
  entry,
  token,
  onRemove,
}: {
  entry: WatchEntry;
  token: Token | null;
  onRemove: () => void;
}) {
  const symbol = token?.symbol || entry.symbol;
  const name = token?.name || entry.name;
  const icon = token?.icon ?? entry.icon;
  const change = token?.stats24h.priceChange ?? null;
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
          {/*
            Truncates rather than shrink-0: the token column is what the fixed numeric columns
            leave over, so at the 640px floor a long symbol would otherwise run into Price.
            The check and launchpad tag keep their width and the symbol gives way first.
          */}
          <span className="truncate text-sm font-medium text-ink">{symbol}</span>
          {token === null ? null : (
            <TokenStatus
              isVerified={token.isVerified}
              launchpad={token.launchpad}
              tagClassName="hidden min-[768px]:inline"
            />
          )}
          </div>
          <span className="mt-0.5 block truncate pl-[30px] text-[12px] text-muted">{name}</span>
        </div>
      </td>
      {/* Price and change are the scan targets: larger, primary ink, semantic colour. */}
      <td className="px-3 py-[11px] text-right text-[15px] tabular-nums text-ink">
        {formatPriceCompact(token?.usdPrice ?? null)}
      </td>
      <td className={`px-3 py-[11px] text-right text-[14px] tabular-nums ${changeColor}`}>
        {formatChange(change)}
      </td>
      {/* Market cap, liquidity and holders read as one secondary cluster, set off by pl-6. */}
      <td className="py-[11px] pl-6 pr-3 text-right text-[12px] tabular-nums text-muted">
        {formatCompactUsd(token?.mcap ?? null)}
      </td>
      <td className="px-3 py-[11px] text-right text-[12px] tabular-nums text-muted">
        <span className="inline-flex items-center justify-end gap-1">
          {thin ? <WarningTriangle /> : null}
          {formatCompactUsd(token?.liquidity ?? null)}
        </span>
      </td>
      <td className="px-3 py-[11px] text-right text-[12px] tabular-nums text-muted">
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
