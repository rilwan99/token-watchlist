"use client";

import { useEffect, useRef, useState } from "react";
import StarButton from "@/components/star-button";
import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import WarningTriangle from "@/components/warning-triangle";
import { formatCompactUsd, formatMint, isMintAddress, isThinLiquidity, volume24h } from "@/app/lib/format";
import type { OrganicScoreLabel, Token } from "@/app/lib/types";

export type SearchState =
  | { kind: "loading" }
  | { kind: "ready"; query: string; results: Token[]; stale: boolean }
  | { kind: "error"; message: string };

type SearchRowItem = { token: Token; exact: boolean };

const PANEL = "flex min-h-0 flex-1 flex-col rounded-xl border border-edge bg-surface";
const CENTERED = `${PANEL} items-center justify-center gap-3 px-6 text-center`;
const SCROLLER = "min-h-0 flex-1 divide-y divide-line";
const SKELETON_ROWS = 5;

const GRID =
  "grid items-center gap-2 grid-cols-[minmax(0,1fr)_44px]" +
  " min-[480px]:grid-cols-[minmax(0,1fr)_74px_32px]" +
  " min-[560px]:grid-cols-[minmax(0,1fr)_74px_74px_32px]" +
  " min-[640px]:grid-cols-[minmax(0,1fr)_74px_74px_13px_70px_32px]" +
  " min-[720px]:grid-cols-[minmax(0,1fr)_74px_74px_13px_70px_56px_32px]";
const CELL_MCAP = "hidden text-right tabular-nums min-[480px]:block";
const CELL_VOLUME = "hidden text-right tabular-nums min-[560px]:block";
const CELL_RULE = "hidden justify-center min-[640px]:flex";
const CELL_LIQUIDITY = "hidden text-right tabular-nums min-[640px]:block";
const CELL_ORGANIC = "hidden items-center justify-end gap-1.5 min-[720px]:flex";
const CELL_STAR = "flex justify-center";

// Preserve Jupiter's ranking; only pin an unambiguous exact-symbol match.
export function arrange(results: Token[], query: string): SearchRowItem[] {
  const symbol = query.trim().toLowerCase();
  const exact = results.filter((token) => token.symbol.toLowerCase() === symbol);
  const pinned =
    exact.find((token) => token.isVerified) ??
    (exact.length === 1 ? exact[0] : null);
  const rest = results
    .filter((token) => token !== pinned)
    .map((token) => ({ token, exact: false }));
  return pinned === null ? rest : [{ token: pinned, exact: true }, ...rest];
}

export default function SearchResults({
  state,
  rows,
  watched,
  highlighted,
  onHighlight,
  onToggle,
  onRetry,
}: {
  state: SearchState;
  rows: SearchRowItem[];
  watched: Set<string>;
  highlighted: number;
  onHighlight: (index: number) => void;
  onToggle: (token: Token) => void;
  onRetry: () => void;
}) {
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

  if (state.kind === "error") {
    return (
      <div role="status" className={CENTERED}>
        <div>
          <p className="text-sm text-ink">Search couldn&apos;t be reached.</p>
          <p className="mt-1 text-xs text-muted">{state.message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
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

  const addressQuery = isMintAddress(state.query);

  return (
    <div
      className={`${PANEL} overflow-hidden transition-opacity ${state.stale ? "opacity-50" : "opacity-100"
        }`}
    >
      <ul aria-label="Search results" className={`${SCROLLER} overflow-y-auto`}>
        <ResultsHeader />
        {rows.map((row, index) => (
          <SearchRow
            key={row.token.id}
            token={row.token}
            exact={row.exact}
            addressQuery={addressQuery}
            watched={watched.has(row.token.id)}
            highlighted={index === highlighted}
            onHighlight={() => onHighlight(index)}
            onToggle={() => onToggle(row.token)}
          />
        ))}
        {rows.length < SKELETON_ROWS ? <ResultsEnd count={rows.length} /> : null}
      </ul>
    </div>
  );
}

function ResultsEnd({ count }: { count: number }) {
  return (
    <li className="flex h-[53px] items-center px-3 text-[11px] text-faint">
      {count === 1 ? "1 match" : `${count} matches`} · End of results
    </li>
  );
}

function ResultsHeader() {
  return (
    <li
      role="presentation"
      className={`${GRID} sticky top-0 z-10 border-l-2 border-transparent bg-raised px-3 py-1.5 text-[11px] text-faint shadow-[0_1px_0_var(--color-edge)] max-[479px]:hidden`}
    >
      <span />
      <span className={CELL_MCAP}>Market cap</span>
      <span className={CELL_VOLUME}>Vol 24h</span>
      <span className={CELL_RULE} />
      <span className={CELL_LIQUIDITY}>Liquidity</span>
      <span className={CELL_ORGANIC}>Organic</span>
      <span className={CELL_STAR} />
    </li>
  );
}

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
      <span className={CELL_STAR} />
    </li>
  );
}

const ORGANIC_BAR: Record<OrganicScoreLabel, string> = {
  high: "bg-accent",
  medium: "bg-ink",
  low: "bg-muted",
};

function SearchRow({
  token,
  exact,
  addressQuery,
  watched,
  highlighted,
  onHighlight,
  onToggle,
}: {
  token: Token;
  exact: boolean;
  addressQuery: boolean;
  watched: boolean;
  highlighted: boolean;
  onHighlight: () => void;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const row = useRef<HTMLLIElement>(null);

  const volume = volume24h(token.stats24h);
  const thin = isThinLiquidity(token.liquidity);
  const organic = token.organicScore === null ? null : Math.round(token.organicScore);

  const endorsed = exact && token.isVerified;

  useEffect(() => {
    if (!highlighted) return;
    row.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const nameLayer = addressQuery
    ? "opacity-0"
    : "opacity-100 group-hover:opacity-0 group-focus-within:opacity-0";
  const addressLayer = addressQuery
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";

  const starLayer = watched
    ? "opacity-100"
    : "opacity-100 min-[480px]:opacity-0 min-[480px]:group-hover:opacity-100 min-[480px]:group-focus-within:opacity-100";

  function handleCopy() {
    navigator.clipboard.writeText(token.id).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => undefined,
    );
  }

  return (
    <li
      ref={row}
      onMouseEnter={onHighlight}
      className={`group ${GRID} scroll-mt-7 border-l-2 px-3 py-2 text-sm ${endorsed ? "border-accent" : exact ? "border-muted" : "border-transparent"
        } ${highlighted ? "bg-raised" : endorsed ? "bg-accent/5" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <TokenIcon
          src={token.icon}
          symbol={token.symbol}
          className="size-7"
          labelClassName="text-[11px]"
          dimmed={!token.isVerified}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`truncate font-medium ${token.isVerified ? "text-ink" : "text-muted"}`}
            >
              {token.symbol}
            </span>
            <TokenStatus isVerified={token.isVerified} launchpad={token.launchpad} />
            {exact ? (
              <span
                className={`shrink-0 rounded border px-1 text-[10px] ${endorsed ? "border-accent/40 text-accent" : "border-edge text-muted"
                  }`}
              >
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
                className="rounded px-0.5 text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {copied ? "✓" : "⧉"}
                <span className="sr-only" aria-live="polite">{copied ? "Address copied" : ""}</span>
              </button>
            </span>
          </div>

          <p className="truncate text-xs text-muted min-[480px]:hidden">
            MC {formatCompactUsd(token.mcap)}, Vol {formatCompactUsd(volume)},{" "}
            <span className="inline-flex items-center gap-1">
              {thin ? <WarningTriangle /> : null}
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
      <span className={`${CELL_LIQUIDITY} text-muted`}>
        <span className="inline-flex items-center justify-end gap-1">
          {thin ? <WarningTriangle /> : null}
          {formatCompactUsd(token.liquidity)}
        </span>
      </span>
      <span className={CELL_ORGANIC}>
        {organic === null ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <span className="h-1 w-[26px] shrink-0 overflow-hidden rounded-full bg-edge">
              <span
                className={`block h-full rounded-full ${token.organicScoreLabel === null
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
      <span className={CELL_STAR}>
        <StarButton
          filled={watched}
          symbol={token.symbol}
          onClick={onToggle}
          className={`transition-opacity ${starLayer}`}
        />
      </span>
    </li>
  );
}
