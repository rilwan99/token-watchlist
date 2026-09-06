"use client";

import { useState } from "react";
import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import WarningTriangle from "@/components/warning-triangle";
import {
  changeTone,
  formatCompactUsd,
  formatChange,
  formatCount,
  formatMint,
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
  const [copied, setCopied] = useState(false);

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

  function handleCopy() {
    navigator.clipboard.writeText(entry.mint).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2_000);
      },
      () => undefined,
    );
  }

  return (
    /*
      Scoped to background-color, not transition-colors: the row's divider comes from the
      tbody's divide-y, which only paints :not(:last-child). A row that stops being last
      gains its 1px border instantly while a colour transition would animate the border
      from the inherited currentColor down to --color-line - a white line flashing across
      the table on every add and every sort click.
    */
    <tr className="group transition-[background-color] hover:bg-raised">
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
          {/*
            The mint trails the name rather than taking a column of its own: the token cell is
            what the fixed columns leave over, so a seventh column would come straight out of
            the symbol. It hides below 900px, where that remainder leaves the name under 50px
            once the address block has taken its ~103px.
          */}
          <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5 pl-[30px] text-[12px]">
            <span className="truncate text-muted">{name}</span>
            <span className="hidden shrink-0 items-baseline gap-1.5 text-[11px] text-faint min-[900px]:flex">
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatMint(entry.mint)}</span>
              {/*
                Opacity rather than display, and its width is reserved in the resting row: the
                button is a tab stop, and fading it keeps the name's truncation point fixed
                whether the row is hovered or not. Same reveal as the remove button below.
              */}
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy the ${symbol} mint address`}
                className="self-center rounded p-0.5 text-faint opacity-0 transition-[color,opacity] hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-accent">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                    <rect x="9" y="9" width="10" height="10" rx="1" />
                    <path d="M5 15V5h10" />
                  </svg>
                )}
                <span className="sr-only" aria-live="polite">{copied ? "Address copied" : ""}</span>
              </button>
            </span>
          </div>
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
