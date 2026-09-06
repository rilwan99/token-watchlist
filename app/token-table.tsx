"use client";

import { useState } from "react";
import TokenCard from "@/app/token-card";
import TokenRow from "@/app/token-row";
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

  function handleRemove(mint: string) {
    setOpenMint((current) => (current === mint ? null : current));
    onRemove(mint);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-surface">
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
            <ul className="divide-y divide-line">
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
              <thead className="whitespace-nowrap border-b border-edge bg-raised text-[11px] text-faint">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 font-medium">Token</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Price</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">24h</th>
                  {/* 24px of extra lead separates the secondary cluster from the primary pair. */}
                  <th scope="col" className="py-3 pl-6 pr-3 text-right font-medium">Market cap</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Liquidity</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Holders</th>
                  <th scope="col" className="py-3 pr-2">
                    <span className="sr-only">Remove from watchlist</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
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
      )}
      <footer className="border-t border-edge bg-raised px-4 py-3 text-xs text-faint">
        Prices update when you refresh.
      </footer>
    </section>
  );
}
