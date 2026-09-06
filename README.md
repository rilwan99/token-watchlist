# Token Watchlist

A single-page Solana token watchlist: search for a token, add it, see its market data, remove it. The list survives a reload.

React 19 + TypeScript on Next.js 16 (App Router), Tailwind v4. No state library, no component library, no database.

## Run it

Requires Node 20.9+ and a Jupiter API key.

```bash
npm install
echo "JUPITER_API_KEY=your_key" > .env   # gitignored, server-side only
npm run dev                              # http://localhost:3000
```

`next dev` reads `.env` at startup, so restart it after changing the key.

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

There is no test script.

## Status

Built: load from storage, search, manual refresh, the desktop table.

Not built yet: add, remove, sort, the 5m/1h/6h/24h switch (the table is pinned to 24h), and the mobile card layout.

## Decisions

The interesting parts of this app are the choices, not the code. Each one below is a constraint the implementation actually holds to.

**Storage holds mint addresses, never market data.** A cached price is wrong the moment it is written, and a table that renders a stale `$148` on load is worse than one that renders a spinner for 300ms. `localStorage` holds the mint list and one `seeded` flag; every price, market cap, and holder count is fetched fresh on load and on refresh.

**SOL is seeded on the first visit only, tracked by a separate flag.** The obvious implementation — "if the list is empty, add SOL" — resurrects SOL every time you remove it, because it treats emptiness as the signal. An empty watchlist is a valid, deliberate state here, so it can't also mean "never initialized". A separate `seeded` boolean records that the seed already happened, and removed SOL stays removed.

**The whole watchlist loads in one request.** Jupiter's search endpoint accepts a comma-separated list of up to 100 mints, so N tokens cost 1 request instead of N. That makes refresh atomic — every row in the table comes from the same response and is therefore the same age — and it sets the soft cap of ~50 tokens, comfortably under the batch limit. The response is not guaranteed to come back in the order the mints were sent, so `fetchWatchlist` re-keys it by mint and restores the stored order.

**Snapshot at load, not a live feed.** No polling, no websocket. There is a manual refresh button and an explicit `Updated 2:32:07 PM` timestamp beside it. A table that silently mutates under you is only useful if you trust its age, and the honest way to earn that is to show the age and let the user re-ask. It also keeps API usage bounded and predictable.

**Search results open a slot; they never cover the watchlist and never move it mid-search.** Two constraints pull against each other here. Pushing the table down as results arrive means the row you were reaching for slides out from under the cursor. Floating a panel over the table fixes that, but a short watchlist then sits entirely behind the results — and checking what you already hold is the whole reason it's on screen. So the results live in normal flow, in a slot that opens when you focus the input and collapses when you dismiss. The page moves exactly once, on your click, before any results exist; the slot's height is fixed while open, so going from three matches to twenty resizes nothing. Search is debounced 250ms with a 2-character minimum and an `AbortController` that cancels superseded requests, so the last thing typed is always the thing rendered. Previous results stay on screen dimmed while a newer query is in flight — only the very first query shows "Searching...".

**Jupiter's result ordering is kept as-is; impersonators are handled visually.** Re-sorting results by liquidity or market cap buries exact symbol matches, and Jupiter's ordering already weighs organic score. The real risk isn't bad ranking, it's adding the wrong token with the right symbol — a legibility problem. So each row carries a verified check or an explicit `UNVERIFIED` pill, a truncated mint, liquidity, and organic score, and unverified rows are rendered recessive: muted symbol, 40%-opacity icon.

**The API key never reaches the browser.** The route handler at `GET /api/tokens` is the only thing that talks to Jupiter, and it holds `JUPITER_API_KEY` server-side (`server-only` is imported in `app/lib/tokens.ts` to enforce that at build time). It also validates mint batches — base58 shape, 100 maximum — so a malformed request fails locally instead of burning an upstream call.

**Every number from upstream is nullable.** Jupiter omits price, market cap, liquidity, and holder count for thin or new tokens. Those fields are normalized to `null` on the way in and rendered as a dash. `NaN` and `undefined` never reach the DOM.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export, accounts, sync, and server-side persistence. One anonymous user, one watchlist, one device.

## Data source

[Jupiter Tokens API V2](https://dev.jup.ag/docs/tokens/v2) — `GET https://api.jup.ag/tokens/v2/search?query={query}`, authenticated with an `x-api-key` header.

The `query` parameter takes a symbol, a name, a mint, or a comma-separated batch of mints. Symbol and name searches return about 20 results; mint batches return up to 100 in one response.

The browser only ever calls the local route:

```text
GET /api/tokens?query=sol
GET /api/tokens?query=So11111111111111111111111111111111111111112
GET /api/tokens?query=mint1,mint2
```

It responds with `{ "tokens": [...] }`, or `{ "error": "..." }` with a 400 (bad query) or 502 (upstream failure). One token:

```json
{
  "id": "So11111111111111111111111111111111111111112",
  "name": "Solana",
  "symbol": "SOL",
  "icon": "<url or null>",
  "isVerified": true,
  "organicScore": 100,
  "usdPrice": 148.72,
  "mcap": 68900000000,
  "liquidity": 123000000,
  "holderCount": 1000000,
  "stats": {
    "5m":  { "priceChange": 0.2, "buyVolume": 1000,   "sellVolume": 900 },
    "1h":  { "priceChange": 1.1, "buyVolume": 8000,   "sellVolume": 7000 },
    "6h":  { "priceChange": 2.4, "buyVolume": 40000,  "sellVolume": 35000 },
    "24h": { "priceChange": 3.6, "buyVolume": 150000, "sellVolume": 120000 }
  }
}
```

All four timeframes arrive in the same response, which is why switching between 5m/1h/6h/24h will not need a refetch.

## Layout

```text
app/
├── api/tokens/route.ts  # The only route: validates the query, calls Jupiter
├── lib/tokens.ts        # Server-side Jupiter client and response normalization
├── lib/types.ts         # Token, TokenStats, Timeframe
├── lib/api.ts           # Browser-side client for /api/tokens
├── lib/storage.ts       # localStorage: mint list and the seeded flag
├── lib/format.ts        # Price, percent, compact USD, count, mint truncation
├── watchlist.tsx        # The client component: search, table, refresh
├── page.tsx             # Server component shell
├── layout.tsx           # Root layout and metadata
└── globals.css          # Tailwind import and theme tokens
```

`AGENTS.md` is the working contract for coding agents in this repo — the same decisions stated as constraints, plus conventions and verification rules.
