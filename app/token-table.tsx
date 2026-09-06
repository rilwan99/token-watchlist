"use client";

import StarButton from "@/components/star-button";
import TokenIcon from "@/components/token-icon";
import TokenStatus from "@/components/token-status";
import {
  formatCompactUsd,
  formatCount,
  formatPercent,
  formatPrice,
  isThinLiquidity,
} from "@/app/lib/format";
import type { Timeframe, Token, WatchEntry } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";

export default function TokenTable({
  entries,
  metrics,
  onRemove,
}: {
  entries: WatchEntry[];
  metrics: Map<string, Token>;
  onRemove: (mint: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
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
              onRemove={() => onRemove(entry.mint)}
            />
          ))}
        </tbody>
      </table>
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
    <tr>
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
          <StarButton filled symbol={symbol} onClick={onRemove} />
        </div>
      </td>
    </tr>
  );
}
