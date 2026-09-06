import {
  formatCompactUsd,
  formatCount,
  formatPercent,
  formatPrice,
} from "@/app/lib/format";
import type { Timeframe, Token } from "@/app/lib/types";

const TIMEFRAME: Timeframe = "24h";

export default function TokenTable({ tokens }: { tokens: Token[] }) {
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
