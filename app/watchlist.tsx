"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWatchlist } from "@/app/lib/api";
import { loadMints } from "@/app/lib/storage";
import { formatCompactUsd, formatCount, formatPercent, formatPrice } from "@/app/lib/format";
import type { Timeframe, Token } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h"; // Becomes state when you add the selector.

type Status = "loading" | "ready" | "error";

export default function Watchlist() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [status, setStatus] = useState<Status>("loading");
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    // Loads the saved watchlist, fetches fresh market data, and updates the load state.
    // Memoized with useCallback to keep a stable function reference
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

    // Loads the persisted watchlist after mount (avoid hyration mismatch)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    function handleRefresh() {
        setStatus("loading");
        void load();
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between pb-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                    {updatedAt === null
                        ? "\u00a0"
                        : `Updated ${updatedAt.toLocaleTimeString("en-US")}`}
                </span>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={status === "loading"}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 font-medium text-black transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                    {status === "loading" ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {status === "error" ? (
                <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : status === "loading" && tokens.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
            ) : tokens.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <tr>
                        <th scope="col" className="py-3 pr-4 font-medium">Token</th>
                        <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
                        <th scope="col" className="py-3 pr-4 text-right font-medium">{TIMEFRAME}</th>
                        <th scope="col" className="py-3 pr-4 text-right font-medium">Market cap</th>
                        <th scope="col" className="py-3 pr-4 text-right font-medium">Liquidity</th>
                        <th scope="col" className="py-3 text-right font-medium">Holders</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {tokens.map((token) => {
                        const change = token.stats[TIMEFRAME].priceChange;
                        return (
                            <tr key={token.id}>
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                        {token.icon === null ? null : (
                                            // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
                                            <img src={token.icon} alt="" className="size-5 rounded-full" />
                                        )}
                                        <span className="font-medium text-black dark:text-zinc-50">{token.symbol}</span>
                                        <span className="text-zinc-500 dark:text-zinc-400">{token.name}</span>
                                    </div>
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums text-black dark:text-zinc-50">
                                    {formatPrice(token.usdPrice)}
                                </td>
                                <td
                                    className={`py-3 pr-4 text-right tabular-nums ${change === null
                                        ? "text-zinc-500 dark:text-zinc-400"
                                        : change < 0
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-green-600 dark:text-green-400"
                                        }`}
                                >
                                    {formatPercent(change)}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {formatCompactUsd(token.mcap)}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {formatCompactUsd(token.liquidity)}
                                </td>
                                <td className="py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
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