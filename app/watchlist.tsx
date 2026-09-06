"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWatchlist } from "@/app/lib/api";
import { loadMints } from "@/app/lib/storage";
import { formatCompactUsd, formatCount, formatPercent, formatPrice } from "@/app/lib/format";
import type { Timeframe, Token } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";

type Status = "loading" | "ready" | "error";

export default function Watchlist() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchWatchlist(loadMints());
      setTokens(next);
      setUpdatedAt(new Date());
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load token data.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the mint list lives in localStorage, readable only after mount
    void load();
  }, [load]);

  function handleRefresh() {
    setStatus("loading");
    void load();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-4 text-xs text-muted">
        <span>
          {updatedAt === null
            ? "\u00a0"
            : `Updated ${updatedAt.toLocaleTimeString("en-US")}`}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={status === "loading"}
          className="rounded-md border border-edge px-3 py-1.5 font-medium text-ink transition-colors hover:bg-edge disabled:opacity-50"
        >
          {status === "loading" ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {status === "error" ? (
        <p className="py-12 text-center text-sm text-down">{error}</p>
      ) : status === "loading" && tokens.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Loading...</p>
      ) : tokens.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          Your watchlist is empty. Search for a token to add one.
        </p>
      ) : (
        <TokenTable tokens={tokens} />
      )}
    </div>
  );
}

function TokenTable({ tokens }: { tokens: Token[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="py-3 pr-4 font-medium">Token</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">{TIMEFRAME}</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Market cap</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Liquidity</th>
            <th scope="col" className="py-3 text-right font-medium">Holders</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {tokens.map((token) => {
            const change = token.stats[TIMEFRAME].priceChange;
            const changeColor =
              change === null ? "text-muted" : change < 0 ? "text-down" : "text-up";
            return (
              <tr key={token.id}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {token.icon === null ? null : (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
                      <img src={token.icon} alt="" className="size-5 rounded-full" />
                    )}
                    <span className="font-medium text-ink">{token.symbol}</span>
                    <span className="text-muted">{token.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink">
                  {formatPrice(token.usdPrice)}
                </td>
                <td className={`py-3 pr-4 text-right tabular-nums ${changeColor}`}>
                  {formatPercent(change)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {formatCompactUsd(token.mcap)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {formatCompactUsd(token.liquidity)}
                </td>
                <td className="py-3 text-right tabular-nums text-muted">
                  {formatCount(token.holderCount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
