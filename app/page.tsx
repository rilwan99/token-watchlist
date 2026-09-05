const tokens = [
  { symbol: "BTC", name: "Bitcoin", price: "$64,210.00", change: "+2.41%", marketCap: "$1.26T" },
  { symbol: "ETH", name: "Ethereum", price: "$3,180.55", change: "+1.08%", marketCap: "$382.4B" },
  { symbol: "SOL", name: "Solana", price: "$148.72", change: "-3.62%", marketCap: "$68.9B" },
  { symbol: "ARB", name: "Arbitrum", price: "$0.9412", change: "+5.77%", marketCap: "$3.4B" },
  { symbol: "LINK", name: "Chainlink", price: "$14.03", change: "-0.94%", marketCap: "$8.7B" },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex w-full flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Token watchlist
          </h1>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="py-3 pr-4 font-medium">Token</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Symbol</th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">24h</th>
                  <th scope="col" className="py-3 text-right font-medium">Market cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {tokens.map((token) => (
                  <tr key={token.symbol}>
                    <td className="py-3 pr-4 text-black dark:text-zinc-50">{token.name}</td>
                    <td className="py-3 pr-4 text-zinc-500 dark:text-zinc-400">{token.symbol}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-black dark:text-zinc-50">
                      {token.price}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        token.change.startsWith("-")
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {token.change}
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                      {token.marketCap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
