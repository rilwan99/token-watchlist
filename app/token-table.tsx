"use client";

import { useState } from "react";
import TokenCard from "@/app/token-card";
import TokenRow from "@/app/token-row";
import { SORT_OPTIONS, sortEntries, type SortKey, type SortState } from "@/app/lib/sort";
import type { Token, WatchEntry } from "@/app/lib/types";

/** Separate layouts share one entry list: the accordion is mobile-only, the table is desktop-only. */
export default function TokenTable({
  entries,
  metrics,
  onRemove,
}: {
  entries: WatchEntry[];
  metrics: Map<string, Token>;
  onRemove: (mint: string) => void;
}) {
  // Session-only accordion state. Opening one row always closes the one before it.
  const [openMint, setOpenMint] = useState<string | null>(null);
  // Session-only too, and shared by both layouts so a rotation keeps the sort. null is the
  // saved order; a refresh re-sorts the new numbers under whatever is active.
  const [sort, setSort] = useState<SortState | null>(null);

  const rows = sortEntries(entries, metrics, sort);

  function handleRemove(mint: string) {
    setOpenMint((current) => (current === mint ? null : current));
    onRemove(mint);
  }

  // Money reads biggest-first, so a fresh column opens descending; a third click returns to
  // the saved order rather than stranding the list in a sort with no way out.
  function cycle(key: SortKey) {
    setSort((current) => {
      if (current === null || current.key !== key) return { key, direction: "desc" };
      return current.direction === "desc" ? { key, direction: "asc" } : null;
    });
  }

  function flip() {
    setSort((current) =>
      current === null
        ? null
        : { key: current.key, direction: current.direction === "desc" ? "asc" : "desc" },
    );
  }

  // overflow-clip, not overflow-hidden: hidden would make the card a scroll container, which
  // silently stops the sticky header below from ever sticking. clip rounds the corners without one.
  return (
    <section className="overflow-clip rounded-xl border border-edge bg-surface">
      {entries.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <p className="text-base font-medium text-ink">Start your watchlist</p>
          <p className="mt-1.5 text-sm text-muted">
            Search above by symbol, name, or mint to add your first token.
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-[320px] min-[640px]:hidden">
            {/*
              The accordion has no header row to click, so the mobile sort is its own band. A
              native select rather than a popup menu: the OS picker is the better target on a
              phone and it costs no dismissal, focus or outside-click handling of ours.
            */}
            <div className="flex items-center gap-2 border-b border-line bg-raised px-3 py-2">
              <span className="text-[11px] text-faint">Sort</span>
              <select
                value={sort?.key ?? ""}
                onChange={(event) =>
                  setSort(
                    event.target.value === ""
                      ? null
                      : { key: event.target.value as SortKey, direction: "desc" },
                  )
                }
                aria-label="Sort watchlist by"
                className="h-7 rounded-md border border-edge bg-surface px-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="">Saved order</option>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={flip}
                disabled={sort === null}
                aria-label={
                  sort?.direction === "asc" ? "Sort highest first" : "Sort lowest first"
                }
                className="flex size-7 items-center justify-center rounded-md border border-edge text-muted transition-colors hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <SortCaret direction={sort?.direction ?? "desc"} className="size-2.5" />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((entry) => (
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
          </div>

          <div className="hidden min-h-[320px] min-[640px]:block">
            <table className="w-full table-fixed text-left">
              {/*
                Token takes what the fixed columns leave, so each of those is the wider of its
                header and its widest value, plus padding - nothing rounded up. "Market cap" is
                the widest thing in its own column, and at 72px the labels had overflowed into
                each other and read as one string. Market cap carries the 24px cluster gap.
              */}
              <colgroup>
                <col />
                <col className="w-[98px]" />
                <col className="w-[84px]" />
                <col className="w-[93px]" />
                <col className="w-[85px]" />
                <col className="w-[64px]" />
                <col className="w-[32px]" />
              </colgroup>
              {/*
                Sticky because the units live in these labels and nowhere else, and a watchlist
                longer than about nine rows scrolls them off the top of a laptop viewport.
              */}
              <thead className="sticky top-0 z-10 whitespace-nowrap border-b border-edge bg-raised text-[11px] text-faint">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 font-medium">Token</th>
                  <SortHeader label="Price" sortKey="price" sort={sort} onSort={cycle} />
                  <SortHeader label="24h" sortKey="change" sort={sort} onSort={cycle} />
                  {/* 24px of extra lead separates the secondary cluster from the primary pair. */}
                  <SortHeader label="Market cap" sortKey="mcap" sort={sort} onSort={cycle} className="pl-6" />
                  <SortHeader label="Liquidity" sortKey="liquidity" sort={sort} onSort={cycle} />
                  <SortHeader label="Holders" sortKey="holders" sort={sort} onSort={cycle} />
                  <th scope="col" className="py-3 pr-2">
                    <span className="sr-only">Remove from watchlist</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((entry) => (
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
      )}
      <footer className="border-t border-edge bg-raised px-4 py-3 text-xs text-faint">
        Prices update when you refresh.
      </footer>
    </section>
  );
}

/**
 * A sortable column label. The caret is absolutely positioned inside the cell's own right
 * padding rather than added beside the label: every numeric column is measured to the wider of
 * its header and its widest value, so an inline glyph would take its width from the token
 * column, which already truncates the symbol at 640px. Nothing moves when the sort changes.
 *
 * An idle header looks inert, so an inactive column fades a faint down caret in on hover or
 * keyboard focus - the direction that first click applies. Opacity, not mount: the caret is
 * absolute either way, but fading keeps hover and the active state one visual idea.
 */
function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort !== null && sort.key === sortKey ? sort.direction : null;

  return (
    <th
      scope="col"
      aria-sort={active === null ? "none" : active === "asc" ? "ascending" : "descending"}
      className="group relative p-0 font-medium"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`w-full cursor-pointer px-3 py-3 text-right transition-colors hover:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
          active === null ? "" : "text-ink"
        } ${className}`}
      >
        {label}
      </button>
      <SortCaret
        direction={active ?? "desc"}
        className={`pointer-events-none absolute right-0 top-1/2 size-2 -translate-y-1/2 transition-opacity ${
          active === null
            ? "text-faint opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "text-ink opacity-100"
        }`}
      />
    </th>
  );
}

/** Solid triangle: up is ascending, down is descending. Fill, so it holds at 8px. */
function SortCaret({ direction, className }: { direction: "asc" | "desc"; className: string }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true" className={`fill-current ${className}`}>
      <path d={direction === "asc" ? "M4 1.5 7.5 6.5h-7z" : "M4 6.5 0.5 1.5h7z"} />
    </svg>
  );
}
