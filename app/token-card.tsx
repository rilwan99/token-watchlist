"use client";

import { useEffect, useRef, useState } from "react";
import TokenIcon from "@/components/token-icon";
import WarningTriangle from "@/components/warning-triangle";
import {
  changeTone,
  formatChange,
  formatCompactUsd,
  formatCount,
  formatMint,
  formatPriceCompact,
  isThinLiquidity,
  volume24h,
} from "@/app/lib/format";
import type { Token, WatchEntry } from "@/app/lib/types";

const TONE: Record<"up" | "down" | "flat", string> = {
  up: "text-up",
  down: "text-down",
  flat: "text-faint",
};

/**
 * The mobile row. Collapsed it carries market state only; everything that says what the token
 * *is* lives in the drawer, which stays rendered but inert while closed.
 */
export default function TokenCard({
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
  const cardRef = useRef<HTMLLIElement>(null);

  const symbol = token?.symbol || entry.symbol || "—";
  const name = token?.name || entry.name || "—";
  const icon = token?.icon ?? entry.icon;
  const change = token?.stats24h.priceChange ?? null;
  const thin = isThinLiquidity(token?.liquidity ?? null);
  const panelId = `token-panel-${entry.mint}`;

  // Wait for the drawer's height transition before asking the browser to reveal its bottom.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const card = cardRef.current;
      if (card !== null && card.getBoundingClientRect().bottom > window.innerHeight) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open]);

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
    <li ref={cardRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised active:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <TokenIcon
          src={icon}
          symbol={symbol}
          className="size-8"
          dimmed={token !== null && !token.isVerified}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className={`truncate text-sm font-medium ${token !== null && !token.isVerified ? "text-muted" : "text-ink"}`}>
              {symbol}
            </span>
            {token?.isVerified ? (
              <span className="shrink-0 text-accent" aria-label="Verified">
                <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                  <path d="m3 8 3 3 7-7" />
                </svg>
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{name}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-[13px] tabular-nums text-ink">
            {formatPriceCompact(token?.usdPrice ?? null)}
          </span>
          <span className={`mt-0.5 block text-[12px] tabular-nums ${TONE[changeTone(change)]}`}>
            {formatChange(change)}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id={panelId}
        inert={!open}
        aria-hidden={!open}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div
            className={`border-l-2 border-accent bg-ground px-3 py-3 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:px-4 ${
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            <dl className="grid grid-cols-3 divide-x divide-edge rounded-r-md border border-edge bg-surface">
              <DrawerStat label="Market cap" value={formatCompactUsd(token?.mcap ?? null)} />
              <DrawerStat
                label="Liquidity"
                value={formatCompactUsd(token?.liquidity ?? null)}
                warning={thin}
              />
              <DrawerStat
                label="24h volume"
                value={formatCompactUsd(token === null ? null : volume24h(token.stats24h))}
              />
            </dl>

            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Trust and token context">
              <SignalChip tone={token?.isVerified ? "positive" : "info"}>
                {token === null ? "Verification —" : token.isVerified ? "Verified" : "Unverified"}
              </SignalChip>
              <SignalChip tone="info">Holders {formatCount(token?.holderCount ?? null)}</SignalChip>
              {token === null || token.launchpad === null ? null : (
                <SignalChip tone="info">{token.launchpad}</SignalChip>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge pt-3">
              <span className="min-w-0 truncate font-mono text-xs text-muted">{formatMint(entry.mint)}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={`Copy the ${symbol} mint address`}
                  className="flex size-9 items-center justify-center rounded-md border border-edge text-muted transition-colors hover:border-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-accent">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                      <rect x="9" y="9" width="10" height="10" rx="1" />
                      <path d="M5 15V5h10" />
                    </svg>
                  )}
                  <span className="sr-only" aria-live="polite">{copied ? "Address copied" : ""}</span>
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label={`Remove ${symbol} from watchlist`}
                  className="flex size-9 items-center justify-center rounded-md border border-edge text-muted transition-colors hover:border-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function DrawerStat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="min-w-0 px-2.5 py-2.5 first:pl-3 last:pr-3 sm:px-4">
      <dt className="truncate text-[10px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1 truncate font-mono text-sm tabular-nums text-ink">
        {warning ? <WarningTriangle /> : null}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function SignalChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "positive" | "info";
}) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] leading-4 ${
      tone === "positive"
        ? "border-accent/40 bg-accent/10 text-accent"
        : "border-accent/40 bg-accent/10 text-accent"
    }`}>
      {children}
    </span>
  );
}
