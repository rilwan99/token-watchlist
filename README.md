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

**Search results open a slot; they never cover the watchlist and never move it mid-search.** Two constraints pull against each other here. Pushing the table down as results arrive means the row you were reaching for slides out from under the cursor. Floating a panel over the table fixes that, but a short watchlist then sits entirely behind the results — and checking what you already hold is the whole reason it's on screen. So the results live in normal flow, in a slot that opens on the first character you type and collapses when you empty or dismiss the field. Focus alone opens nothing: an empty field has nothing to show, and the placeholder already says what to type. The page moves exactly once, on your keystroke, before any results exist; the slot's height is fixed while open, so going from three matches to twenty resizes nothing. Search is debounced 250ms with a 1-character minimum and an `AbortController` that cancels superseded requests, so the last thing typed is always the thing rendered. A settled answer stays on screen dimmed while a newer query is in flight, and "no tokens match" counts as an answer — it's held exactly like a list of rows would be. Tearing it down to a skeleton on every keystroke made the whole panel flash between two near-identical messages, which is a lot of motion to say nothing changed. Holding it stays truthful because the message names the query it came from, not whatever is currently in the box. A failure is not an answer and doesn't persist: its Retry button would sit there live, inviting a second request while one is already in flight. So the skeleton appears only when there is genuinely nothing to preserve — the first search of a session, or the one after a failure.

One character is a deliberate threshold, not an oversight. Jupiter caps a search at 20 results and ranks them, so a single letter is a useful preview rather than a thousand junk tokens: `s` returns SOL, Sonic and SPYx; `b` returns WBTC, cbBTC and xBTC. Holding the panel back to two characters would have cost a keystroke and bought nothing.

**Four panel states, and none of them close the panel.** A search that returns nothing and a search that never happened are different facts, so they read differently: no matches names the query back to you and suggests a symbol, a name, or a mint address; a failure says it couldn't reach the search and offers a retry that re-runs the same query. The fixed-height slot is what keeps switching between them from heaving the page around: the slot stays at its 416px cap for every open state, so a message and twenty scrolling results push the table down by exactly the same amount. A panel that sized itself to its contents would jump ~370px a quarter-second after a keystroke, untied to anything you did, which is the precise failure the constraint exists to prevent.

But a fixed slot alone isn't enough, because it moves the problem rather than solving it. A one-row message sitting at the top of a 416px slot leaves ~350px of nothing between the panel and the watchlist — no longer a jump, just a hole, and a hole that changes size as states change. So the panel fills the slot in every state: 416px slot, 412px panel, always. Loading fills it with skeleton rows built from the same grid as real results, pinned to the 53px a real row measures, so results landing swap content without moving a single column or row edge — eight of them, enough to overrun the panel so the last clips exactly as a scrolling list does. No-match and failure centre their message in the panel instead. The emptiness that's left is enclosed by the panel's own border, which reads as a panel with little to say rather than an unexplained gap.

**Every result row says whether it's already on your watchlist.** The panel covers a short watchlist completely, so "do I already have this?" can't be answered by looking past it. The row answers it directly.

**Search results are grouped, never re-sorted or filtered.** The risk here isn't bad ranking, it's adding the wrong token with the right symbol. Searching `BONK` returns a token whose symbol is `BONKGUY` and whose name is `UNIPCS`, alongside another whose symbol is `UNIPCS` and whose name is `bonkguy was right` — the names and symbols are deliberately shuffled, so neither field can be trusted to tell them apart. What separates them is money: $293M of liquidity against $787.

So the row is built around that comparison. Identity sits left; market cap, 24h volume, liquidity and organic score are right-aligned in fixed columns with tabular figures, formatted to three significant figures so every cell caps at five characters and the column edge holds. A vertical rule splits the four into two groups: market cap and volume are comparison values you read against each other, liquidity and organic are threshold values you check against a bar. Units live in one sticky header rather than repeating "Liq" on every line — and that header sits *inside* the scroll container, because outside it the scrollbar narrows the rows and drops every value 15px left of its own label.

Ordering is still Jupiter's, which already weighs organic score. But the first exact symbol match is pinned to the top with an accent border and an `Exact` tag, and rows that are unverified or below $10K of liquidity fall under a labelled divider. They are demoted, never hidden — the pin is what keeps the split from burying the token you actually typed. Unverified rows read recessive: muted symbol, dimmed icon, and their launchpad shown as a tag. That comes from Jupiter's `launchpad` field, not from sniffing the mint suffix, which lies in both directions — a `…bonk` suffix appears on verified letsbonk.fun launches, and plenty of pump.fun tokens carry no suffix at all.

**The mint address is on the row, but not in the way.** It's the only field that identifies a token beyond doubt and the least scannable thing you could put in a list, so it stays off the default row and replaces the name line on hover or keyboard focus, in mono, with a copy button. The two layers swap by opacity rather than `display`, because a `display: none` button can't be tabbed to — reaching that button is what reveals the address, and it's the row's only tab stop. Paste a mint into the search box and every row shows its address without waiting for a hover. There's no partial-address matching to support: Jupiter matches a mint only in full, so a partial one returns nothing at all.

**The API key never reaches the browser.** The route handler at `GET /api/tokens` is the only thing that talks to Jupiter, and it holds `JUPITER_API_KEY` server-side (`server-only` is imported in `app/lib/tokens.ts` to enforce that at build time). It also validates mint batches — base58 shape, 100 maximum — so a malformed request fails locally instead of burning an upstream call.

**Every number from upstream is nullable.** Jupiter omits price, market cap, liquidity, and holder count for thin or new tokens, and reports `isVerified` as `null` rather than `false`. Those fields are normalized on the way in and rendered as an em dash — never `$0`, which on a search row would read as a real zero-liquidity signal. `NaN` and `undefined` never reach the DOM. There is no total volume field either: 24h volume is buy plus sell, and since a token can legitimately have buys and no sells, only a missing pair reads as unknown.

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
  "launchpad": "<pump.fun, letsbonk.fun, or null>",
  "organicScore": 100,
  "organicScoreLabel": "high",
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
├── watchlist.tsx        # Client component: state, effects, page layout
├── search-results.tsx   # The results panel: header, grouping, result rows
├── token-table.tsx      # The watchlist table
├── page.tsx             # Server component shell
├── layout.tsx           # Root layout and metadata
└── globals.css          # Tailwind import and theme tokens
```

`AGENTS.md` is the working contract for coding agents in this repo — the same decisions stated as constraints, plus conventions and verification rules.
