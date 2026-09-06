"use client";

import { useState } from "react";
import TokenCard from "@/app/token-card";
import TokenRow from "@/app/token-row";
import type { Timeframe, Token, WatchEntry } from "@/app/lib/types";

// The one place both layouts read their timeframe from; it becomes session state when the
// 5m/1h/6h/24h switch lands.
const TIMEFRAME: Timeframe = "24h";

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
    <>
      <div className="min-[480px]:hidden">
        <ul className="overflow-hidden rounded-md border border-edge">
          {entries.map((entry) => (
            <TokenCard
              key={entry.mint}
              entry={entry}
              token={metrics.get(entry.mint) ?? null}
              timeframe={TIMEFRAME}
              open={openMint === entry.mint}
              onToggle={() =>
                setOpenMint((current) => (current === entry.mint ? null : entry.mint))
              }
              onRemove={() => handleRemove(entry.mint)}
            />
          ))}
        </ul>
      </div>

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
                timeframe={TIMEFRAME}
                onRemove={() => handleRemove(entry.mint)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
