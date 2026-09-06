"use client";

import { useState } from "react";
import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import {
  changeTone,
  formatChange,
  formatCompactUsd,
  formatCount,
  formatMint,
  formatPercent,
  formatPrice,
  formatPriceCompact,
  isThinLiquidity,
  volume24h,
} from "@/app/lib/format";
import type { Timeframe, Token, WatchEntry } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";

const TONE: Record<"up" | "down" | "flat", string> = {
  up: "text-up",
  down: "text-down",
  flat: "text-muted",
};

/**
 * Two layouts over one entry list: cards below 480px, the table at and above it. Only one is
 * in the DOM's flow at a time, so the hidden one is out of the tab order and off screen
 * readers too.
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
  // Accordion, one row at a time. Session state - a reload lands with every card collapsed.
  const [openMint, setOpenMint] = useState<string | null>(null);

  function handleRemove(mint: string) {
    setOpenMint((current) => (current === mint ? null : current));
    onRemove(mint);
  }

  return (
    <>
      <ul className="divide-y divide-edge min-[480px]:hidden">
        {entries.map((entry) => (
          <TokenCard
            key={entry.mint}
            entry={entry}
            token={metrics.get(entry.mint) ?? null}
            open={openMint === entry.mint}
            onToggle={() =>
              setOpenMint((current) => (current === entry.mint ? null : entry.mint))
            }
            onRemove={() => handleRemove(entry.mint)}
          />
        ))}
      </ul>

      <div className="hidden w-full overflow-x-auto min-[480px]:block">
        <table className="w-full text-left text-sm">
          <thead className="whitespace-nowrap border-b border-edge text-xs uppercase tracking-wide text-muted">
            <tr>
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
                onRemove={() => handleRemove(entry.mint)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Collapsed card: the market state only - price and 24h change. Name, mint, verification,
 * launchpad and the remove control all live in the panel, so the row holds its 44px height
 * and the price column keeps its width at 375px.
 */
function TokenCard({
  entry,
  token,
  open,
  onToggle,
  onRemove,
}: {
  entry: WatchEntry;
  token: Token | null;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const symbol = token?.symbol || entry.symbol;
  const icon = token?.icon ?? entry.icon;
  const change = token?.stats[TIMEFRAME].priceChange ?? null;
  const thin = isThinLiquidity(token?.liquidity ?? null);
  const panelId = `token-panel-${entry.mint}`;

  function handleCopy() {
    navigator.clipboard.writeText(entry.mint).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      },
      () => undefined,
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center gap-2 py-2 text-left transition-colors active:bg-edge/40"
      >
        <TokenIcon
          src={icon}
          symbol={symbol}
          className="size-5"
          dimmed={token !== null && !token.isVerified}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{symbol}</span>
        <span className="shrink-0 text-right font-mono text-[13px] tabular-nums text-ink">
          {formatPriceCompact(token?.usdPrice ?? null)}
        </span>
        <span
          className={`min-w-[62px] shrink-0 text-right text-[13px] tabular-nums ${TONE[changeTone(change)]}`}
        >
          {formatChange(change)}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
            open ? "rotate-90" : ""
          }`}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* No height animation: the panel is in the DOM or it is not. */}
      {open ? (
        <div id={panelId} className="bg-ground pb-3 pl-7 pr-1 pt-2.5 text-[13px]">
          <dl>
            <Metric label="Market cap" value={formatCompactUsd(token?.mcap ?? null)} />
            <Metric
              label="Liquidity"
              value={formatCompactUsd(token?.liquidity ?? null)}
              tone={thin ? "text-down" : "text-ink"}
            />
            <Metric
              label="24h volume"
              value={formatCompactUsd(token === null ? null : volume24h(token.stats[TIMEFRAME]))}
            />
          </dl>

          <div className="mt-2.5 border-t border-edge">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy the ${symbol} mint address`}
              className="inline-flex min-h-11 items-center gap-2 rounded text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
            >
              <span className="font-mono">{formatMint(entry.mint)}</span>
              <span className="text-xs">{copied ? "Copied" : "⧉"}</span>
            </button>
            {/* Absent metrics mean Jupiter no longer returns the mint, and unknown
                verification is not the same claim as unverified. */}
            {token === null ? null : (
              <p className="text-xs text-muted">
                {token.isVerified ? "Verified" : "Unverified"}
                {token.launchpad === null ? "" : ` · ${token.launchpad}`}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-down transition-opacity active:opacity-60 focus-visible:outline-none focus-visible:underline"
          >
            Remove from watchlist
          </button>
        </div>
      ) : null}
    </li>
  );
}

function Metric({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function TokenRow({
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

  const change = token?.stats[TIMEFRAME].priceChange ?? null;
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
