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

Built: load from storage, search with animated mobile results, add, remove with undo, manual refresh, the unified dark watchlist card, desktop table, and mobile accordion with animated details.

Not built yet: sort and the 5m/1h/6h/24h switch (both layouts are pinned to 24h).

## Decisions

The interesting parts of this app are the choices, not the code.

**Storage holds identity, never market data.** A cached price is wrong the moment it is written, so `localStorage` holds only what doesn't go stale — mint, symbol, name, icon URL, in saved order — plus one `seeded` flag. Price, market cap, liquidity and holders are always fetched fresh.

That split is what lets a reload paint immediately. The rows come from storage on the first commit with an em dash in every numeric column, and the fetch fills the numbers in a moment later. There's no full-page spinner, because knowing what's on your list never needed the network — only knowing what it's worth does.

**Storage is written by an add or a remove, and by nothing else.** No effect mirrors state into it, and no fetch writes back to it. That's a correctness property rather than tidiness: a refresh that was already in flight when you removed a row returns a response containing that row, and since the response only ever populates the mint-keyed metrics map — never the entry list — it cannot resurrect it. The cost is that the seeded SOL row carries no stored icon until it's re-added, so it shows a placeholder disc for the few hundred milliseconds before the first fetch lands. Writing identity back on every refresh would fix that and reopen the race; the flash is the cheaper problem.

**Everything is keyed by mint address, and nothing by symbol.** Search `unipcs` and Jupiter returns four tokens whose symbol and name are permutations of UNIPCS and BONKGUY, including one called `BONKGUY` named "Unipcs" and one called `UNIPCS` named "bonkguy was right". Symbol as a key adds the wrong one of those and then reports a duplicate when you add the right one.

**A saved token the API stops returning keeps its row.** It renders from the stored name and icon with dashes for every metric, rather than vanishing — a token can lose its liquidity or fall out of the index, and neither is the user changing their mind. The same code path is what makes the first paint of a reload work, so it isn't a special case anyone has to remember to maintain. Storage that is malformed, absent, or half-written by a second tab falls back to an empty list; duplicate mints are collapsed on the way in. Two tabs are last-write-wins, which is fine for a list of favourites — crashing is not.

**SOL is seeded on the first visit only, tracked by that flag.** The obvious version — "if the list is empty, add SOL" — resurrects SOL every time you remove it, because it treats emptiness as the signal. An empty watchlist is a valid, deliberate state here, so it can't also mean "never initialized".

**The whole watchlist loads in one request.** Jupiter's search endpoint accepts up to 100 comma-separated mints, so N tokens cost 1 request. That makes refresh atomic — every row comes from the same response and is the same age — and it sets the soft cap of ~50 tokens. The response isn't guaranteed to come back in the order the mints were sent, or to be complete, and neither matters: `fetchTokens` hands it over as-is and the stored entry list decides what rows exist and in what order.

**Snapshot at load, not a live feed.** No polling, no websocket — a manual refresh button and an explicit `Updated 2:32:07 PM` in the toolbar. A table that silently mutates under you is only useful if you trust its age, and the honest way to earn that is to show the age and let the user re-ask.

**The visual system has one set of roles.** `ground` is the page, `surface` is a card, and `raised` is a header, footer, or hover state. `edge` and `line` distinguish a card boundary from a row divider; `ink`, `muted`, and `faint` distinguish primary, secondary, and tertiary text. Lime `accent` marks focus, verification, and exact matches, amber `warn` marks thin liquidity, and green/red are reserved exclusively for price up/down.

**Search results open a slot; they never cover the watchlist and never move it mid-search.** Two constraints pull against each other. Pushing the table down as results arrive means the row you were reaching for slides out from under the cursor. Floating a panel over the table fixes that, but a short watchlist then sits entirely behind the results — and checking what you already hold is the whole reason it's on screen. So the results live in normal flow, in a slot that opens on the first character you type and collapses when you empty or dismiss the field. Focus alone opens nothing: an empty field has nothing to show, and the placeholder already says what to type. The page moves exactly once, on your keystroke, before any results exist.

One character is deliberate. Jupiter ranks what it returns, so a single letter is a useful preview rather than a thousand junk tokens: `s` gives SOL, Sonic and SPYx. Search is debounced 250ms with an `AbortController` cancelling superseded requests, so the last thing typed is always the thing rendered.

**The slot is fixed to five result rows and the panel fills it in every state.** It is 269px below 480px, where the header is hidden, and 297px at larger widths for the header plus five rows. Sizing the panel to its contents would jump a quarter-second after a keystroke, untied to anything you did — the precise failure the constraint exists to prevent. Growing the slot to fit every result would push the table off the fold. Loading fills the slot with five skeleton rows built from the same grid as real results, pinned to the 53px a real row measures, so results land without moving a single column or row edge; no-match and failure centre their message instead. A settled answer with fewer than five matches adds a muted `N matches · End of results` row directly after its last token, making the remaining capacity explicit without padding the ranking with recommendations. The emptiness that's left is enclosed by the panel's own border, which reads as a panel with little to say rather than an unexplained gap.

**On a phone, the panel arrives with the interaction that opened it.** As the reserved slot expands on the first keystroke, its panel fades and slides down over 200ms; it reverses on close. The slot's height still controls the only page movement, so delayed results never move the watchlist. Reduced-motion turns off both transitions.

**Four panel states, and none of them close the panel.** A search that returns nothing and a search that never happened are different facts, so they read differently: no matches names the query back to you and suggests a symbol, a name, or a mint; a failure says it couldn't reach the search and offers a retry. A settled answer stays on screen dimmed while a newer query is in flight, and "no tokens match" counts as an answer — tearing it down to a skeleton on every keystroke flashed the whole panel between two near-identical messages. Holding it stays truthful because the message names the query it came from, not whatever is currently in the box. A failure is not an answer and doesn't persist: its Retry would sit there live, inviting a second request while one is already running.

**Search results are never re-sorted.** The risk isn't bad ranking, it's adding the wrong token with the right symbol. `BONK` returns a token whose symbol is `BONKGUY` and whose name is `UNIPCS`, alongside another whose symbol is `UNIPCS` and whose name is `bonkguy was right` — the fields are deliberately shuffled, so neither tells them apart. What separates them is money: $293M of liquidity against $787.

So the row is built around that comparison. Identity sits left; market cap, 24h volume, liquidity and organic score are right-aligned in fixed columns with tabular figures, formatted to three significant figures so every cell caps at five characters and the column edge holds. A vertical rule splits them into two groups: market cap and volume are comparison values you read against each other, liquidity and organic are threshold values you check against a bar. Units live in one sticky header rather than repeating "Liq" on every line — and that header sits *inside* the scroll container, because outside it the scrollbar narrows the rows and drops every value 15px left of its own label.

An earlier version split the list under an "Unverified · low liquidity" divider. Checking it against the live API killed it: Jupiter ranks the real token first for `USDC`, `BONK`, `JUP` and `TRUMP`, so the split was a no-op on three of four — and on the fourth it demoted verified `DJTx` under a divider calling it unverified, while `BONKGUY` at $15.9K sat under "low liquidity". A two-bit rule layered over a ranking that already weighs verification, liquidity, volume and organic score could only lose information.

**One row is dropped, and it isn't a ranking call.** Jupiter matches names as well as symbols and defaults to 20 results, which breaks the most likely query this app will ever see: `sol` matches "**Sol**utions" and "**Sol**ar", so 14 of those 20 slots go to tokenised equities, pushing JitoSOL, mSOL and PSOL to ranks 18–20 and dropping bSOL and dSOL entirely. What those 14 share isn't being stocks — none has a 24h change, nine have no price, and they hold two to twelve addresses each. Every column this app renders is blank for them, which makes them empty results rather than weak ones. So `searchUpstream` sends `limit=50` and drops rows with null liquidity, leaving `sol` opening on SOL, JupSOL, SOLCAT, JitoSOL, mSOL, PSOL, bSOL.

Filtering Jupiter's `rwa` tag instead was tempting and wrong for the same reason the divider was: it's a category judgment layered over a ranking, and it deletes `NVDAx` — $1.86M of liquidity, first result for `nvda` — along with `TSLAx` and `SPYx`. Tokenised equities are SPL mints that fill every column; "Solana only" is a rule about chains. Mint queries skip both the filter and the limit: pasting an address names one exact token, and `fetchTokens` rehydrates through that same request shape, so filtering it would make a token that lost its liquidity vanish from the table while its mint sat in storage, unable to come back.

**With the divider gone, the row carries the whole story.** Unverified rows read recessive: muted symbol, dimmed icon, and launchpad as a tag. A verified token gets a lime check; the absence of that check is the unverified signal, so symbol and name can live on separate lines without a reserved glyph slot. The launchpad comes from Jupiter's `launchpad` field, not from sniffing the mint suffix, which lies in both directions: a `…bonk` suffix appears on verified letsbonk.fun launches, and plenty of pump.fun tokens carry none.

**The pin answers "is this what you typed", not "is this safe".** The exact symbol match is pinned to the top, but the accent border and `Exact` tag only render in accent ink when that token is also verified. When several unverified tokens share the typed symbol the pin is suppressed entirely — `BONKGUY` returns three, and decorating one as *the* match is a claim nothing on the row can support.

**The mint address is on the row, but not in the way.** It's the only field that identifies a token beyond doubt and the least scannable thing you could put in a list, so it replaces the name line on hover or keyboard focus, in mono, with a copy button. The two layers swap by opacity rather than `display`, because a `display: none` button can't be tabbed to — reaching that button is what reveals the address, and it's the row's only tab stop. Paste a mint into the search box and every row shows its address without a hover.

On a search row this is deliberately desktop-only. Touch has no hover to trigger the swap, and the alternatives all cost more than they return: a permanently visible address turns five scannable rows into five walls of base58, and a third tap target crowds a row that has one clear job. Below 480px the row keeps the name and the star, and copying a mint happens in the watchlist card's accordion panel, which was built with room for it.

**The search star is the control and the indicator.** A search result ends in a star: filled means saved, outline means not, clicking toggles. A badge that reports membership plus a button that changes it are two things that can disagree; one target that does both cannot. It replaced an `On list` text badge that said the same thing in more space and did nothing. A watchlist row already proves membership by existing, so its matching fixed column carries an explicit `×` remove button instead.

Making the whole row tappable on mobile looks like the friendlier choice and isn't. The star toggles, so a row-sized target means a stray tap during a flick-scroll through a 269px slot silently *removes* a saved token — and the undo lives in the watchlist, not the search panel. An accidental add costs one tap; an accidental remove costs the token. Tapping a row also already means "expand this card" on the mobile watchlist, and means "open this token" in every other Solana app. The star stays the target: 44px, always visible below 480px, and right where a thumb sits.

Its column is reserved in the resting row, so nothing shifts when you hover. A filled star never hides, because on a short watchlist sitting behind the open panel it's the only thing saying "you already have this". An empty one is an invitation, and five of them down a panel is noise, so above 480px it fades in on hover or keyboard focus — by opacity, never `display`, because it's a tab stop and tabbing to it is how a keyboard user finds it. Below 480px there's no hover to wait for, so it stays visible at a 44px target.

Adding uses the token object the search already returned, so the new row arrives complete without a second request, and the panel stays open with the query intact — one search is usually worth more than one token. Removal is one click with no confirmation: an eight-second inline undo replaces the last removal only, restoring that entry at its original position without refetching. The offer expires on a later add or remove, and a refresh does not disturb it.

**Arrow keys move a highlight; Enter toggles it.** Up and down walk the results and wrap at both ends, Enter stars the highlighted row and leaves the panel open, Escape empties the field, which closes the panel and returns focus to the input. The highlight starts on nothing, so Enter on a fresh search does nothing rather than adding whatever happened to rank first. The pointer moves the same index on `mouseenter`, so hovering row 7 and pressing Enter can never toggle row 3.

**Unverified and illiquid tokens are addable, and they carry their warnings with them.** Blocking them would be the wrong call — a thin unverified token is exactly the kind of thing a watchlist is for, and the row's job is to say what a token is, not to decide. So the absent verified check, launchpad tag, dimmed icon and amber liquidity triangle all follow the token into the watchlist row, where it's actually looked at from then on. They render only when the live token is in hand: for a row painted from storage alone, verification is unknown, and an absent check makes no stronger claim.

**One dark card encloses both layouts.** It has a raised desktop header band, line-divided rows, a manual-refresh footer, and a 320px minimum body; an empty list keeps the card and footer but omits the useless header row. Below 480px the watchlist uses the redesigned accordion; above it the fixed-column table has a 92px compact-price column and hover-revealed remove control.

**The mobile drawer answers whether the token still belongs on the list.** Market cap, liquidity and 24h volume lead in equal, tabular-number cells; thin liquidity gets an amber triangle, leaving red and green exclusively for price direction. Trust and context signals follow as wrapping chips: verification, holders, and launchpad where available. The mint and copy/remove icon buttons sit last. Remove is a quiet outlined control and copying swaps its icon to an accent check. If opening a drawer pushes its bottom below the viewport, it scrolls into view after the expansion settles.

The chevron is on every mobile row, always, even though it's redundant on a row you've already tapped — it's the only thing that says the row does anything at all, and revealing it on interaction would be revealing it to someone who already knows. The panel expands and collapses over 200ms with the same ease-out timing as the search results, while its content fades and slides in step. Keeping the panel in the DOM makes that exit possible, so a collapsed panel is inert and hidden from assistive technology rather than leaving its controls in the tab order.

**Price stays compact, and 24h change stops lying about zero.** `formatPriceCompact` writes `$0.00005545` as `$0.0₄5545` — subscript-zero notation, the subscript counting the zeros — and caps every output at nine characters, including in the desktop table's fixed price column. A 24h change that rounds to `0.00%` renders faint and drops its sign in both layouts. A stablecoin sitting at +0.001% is not up, and painting it green says it is.

**The API key never reaches the browser.** The route handler at `GET /api/tokens` is the only thing that talks to Jupiter (`server-only` is imported in `app/lib/tokens.ts` to enforce that at build time). It also validates mint batches — base58 shape, 100 maximum — so a malformed request fails locally instead of burning an upstream call.

**Every number from upstream is nullable.** Jupiter omits price, market cap, liquidity and holder count for thin or new tokens, and reports `isVerified` as `null` rather than `false`. Those are normalized on the way in and rendered as an em dash — never `$0`, which on a search row would read as a real zero-liquidity signal. `NaN` and `undefined` never reach the DOM. There's no total volume field either: 24h volume is buy plus sell, and since a token can legitimately have buys and no sells, only a missing pair reads as unknown.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export, accounts, sync, and server-side persistence. One anonymous user, one watchlist, one device.

## Data source

[Jupiter Tokens API V2](https://dev.jup.ag/docs/tokens/v2) — `GET https://api.jup.ag/tokens/v2/search?query={query}`, authenticated with an `x-api-key` header.

The `query` parameter takes a symbol, a name, a mint, or a comma-separated batch of mints. Symbol and name searches default to 20 results and accept a `limit`; this app sends `limit=50`. Mint batches return up to 100 in one response and need no `limit`.

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
├── lib/types.ts         # Token, TokenStats, Timeframe, WatchEntry
├── lib/api.ts           # Browser-side client for /api/tokens
├── lib/storage.ts       # localStorage: saved identities and the seeded flag
├── lib/format.ts        # Price, percent, compact USD, count, mint truncation and validation, liquidity threshold, 24h volume
├── watchlist.tsx        # Client component: the entry list, metrics, undo, page layout
├── use-token-search.ts  # The search state machine: query, debounce, abort, dismissal, keyboard highlight
├── search-results.tsx   # The results panel: header, rows, empty and error states
├── token-table.tsx      # Picks the layout for one entry list and owns the open card
├── token-card.tsx       # Mobile: the accordion row and its drawer
├── token-row.tsx        # Desktop: one table row
├── page.tsx             # Server component shell
├── layout.tsx           # Root layout and metadata
└── globals.css          # Tailwind import and theme tokens

components/
├── star-button.tsx       # The add/remove toggle both row types use
├── token-icon.tsx        # Token icon with a fallback for missing and broken URLs
└── token-status.tsx      # Shared verified/unverified marker and launchpad tag
```

`AGENTS.md` is the working contract for coding agents in this repo — the same decisions stated as constraints, plus conventions and verification rules.
