<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Token watchlist

Single-page Solana token watchlist: search, add, view market data, remove. Survives reload.

React 19 + TypeScript on Next.js 16 App Router, Tailwind v4. No state library, no component library, no database.

## Commands

`npm run dev` · `npm run lint` · `npm run typecheck`. There is no test script.

`JUPITER_API_KEY` lives in `.env` (gitignored, untracked). `next dev` must be restarted after changing it.

## Data source

Jupiter Tokens API V2: `GET https://api.jup.ag/tokens/v2/search?query={query}`, header `x-api-key`. Fields used are typed in `app/lib/types.ts` and normalized in `app/lib/tokens.ts`.

- `query` takes a symbol, name, or mint. A mint matches only in full, so there is no partial-address state to render.
- Comma-separated mints return in one response, max 100. This is how the watchlist loads.
- Name/symbol search returns 20 by default; `limit` is honoured to at least 200. It matches names as well as symbols, so "sol" pulls in "Solutions" and "Solar".
- `isVerified` is `null`, not `false`, on unverified tokens.
- There is no total volume field. 24h volume is `stats24h.buyVolume + stats24h.sellVolume`, and one side can be null on its own.
- `launchpad` and `organicScoreLabel` are first-class fields. Never infer either — mint suffixes lie in both directions.
- Nearly every field is nullable upstream. Normalize to `null` on the way in, render a dash, never `NaN` or `undefined`.

## Flows

1. **Load** — rehydrate mints from storage, one batch request, render.
2. **Search** — by symbol, name, or mint, debounced into the results slot.
3. **Add** — from a result row; row flips to added, duplicates blocked.
4. **Remove** — one click, no confirmation; an eight-second undo restores the last row at its original position.
5. **Sort** — client-side on price, 24h change, market cap, liquidity, holders.
6. **Refresh** — manual button plus "last updated" timestamp.

Every flow above is in, on both layouts. Update this line as anything lands. The timeframe switch is cut, not pending — every change column is 24h.

## Settled decisions

### Data and storage

- Storage holds identity only — mint, symbol, name, icon URL, saved order, plus a `seeded` flag. Never metrics: a cached number is wrong the moment it is written.
- `isMintAddress` in `app/lib/format.ts` is the only base58 check — storage narrowing, the route's batch guard, `isMintQuery` and the search row's address reveal all call it. Never inline a fresh one.
- A stored mint Jupiter no longer returns keeps its row and its stored name, with dashes for every metric.
- Malformed or absent storage falls back to an empty list rather than throwing, and duplicate mints collapse on the way in. Two tabs are last-write-wins.
- `TokenIcon` remembers the URL that failed, not a boolean. Rows are keyed by mint, so a boolean kept initials until reload even after Jupiter returned a working URL.
- Blocked IPFS icons (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, from `Cross-Origin-Resource-Policy: same-origin`) are accepted console noise: no client-side change reaches that header and the initials fallback renders those rows correctly. A proxy route was rejected — a URL-taking proxy needs an SSRF allowlist and a cache policy for a cosmetic gain.
- SOL seeds on the `seeded` flag, not on an empty list, so removed SOL stays removed. An empty watchlist is valid.
- Remove offers an eight-second undo for the last row only, reinserting at its original index through the normal storage commit. A later add, remove or undo clears it.
- One anonymous user, one watchlist, one device. Solana only. Soft cap ~50 tokens, under the 100-mint batch limit.
- 24h is the only timeframe. `toToken` normalizes only `stats24h`, and `Token.stats24h` is a single `TokenStats`, not a keyed map — don't reintroduce a `Timeframe` type as scaffolding.
- Sort is session state in `token-table.tsx`, never persisted. `sortEntries` returns the saved order untouched when the sort is null, so storage stays the one source of order.
- Five sortable keys: price, 24h change, market cap, liquidity, holders. Not volume — it has no desktop column, and a seventh would re-measure every fixed width. Nulls sort last in both directions; ties keep saved order through a stable sort.

### Layout

- One bounded surface card encloses both render paths — desktop table above 640px, mobile accordion below — with a header band and a manual-refresh footer. Empty lists keep the card and footer, omit the header band.
- A populated card is exactly as tall as its rows: no minimum on either path. A floor there reads as blank rows between the last token and the footer.
- The empty state's body has a small floor — the header band plus one row — so emptying the list doesn't drop the copy down the page.
- The page column caps at 1120px, centred, so the search row and the card share one width and one left edge. The table never scrolls horizontally; the accordion covers every width the columns cannot fit.
- No internal scroll container, no pagination, no virtualization — the document scrolls. A nested scroller would fight touch scrolling, shift the fixed numeric columns, and break `scrollIntoView`. The `<thead>` is `sticky top-0 z-10` instead, because the units live in those labels. The card must stay `overflow-clip` — `overflow-hidden` makes it a scroll container and the sticky header silently stops sticking.

### The search slot

- The slot sits in normal flow and opens on the first character typed
- The slot is fixed to five result rows in every open state and the panel fills it. A content-sized panel jumps a debounce after a keystroke; a slot that grows to fit all results pushes the table off the fold.
- 250ms debounce, 1-character minimum, `AbortController` cancelling superseded requests, no submit button. One character is a real search — Jupiter ranks what it returns.
- A settled answer persists dimmed while a newer query loads, and "no matches" is an answer too.
- An empty or failed search never closes the panel.
- The no-match message and the exact pin read the query carried on the `ready` state, never the live input; during the debounce the two differ.
- Skeleton rows reuse `GRID` and the real cell classes at the height a real row measures, so results land without moving a column or row edge. A short answer gets a terminal `N matches · End of results` row rather than invented recommendations.
- Escape is handled on the search wrapper, not the input, so it reaches the panel's tab stops. Those go `inert` on close, so dismissing must return focus to the input.
- Arrow keys and `mouseenter` share one highlight index, so pointer and keyboard never disagree about which row Enter means. Enter toggles the star without closing. `arrange` is exported so the wrapper's key handler and the panel agree on row order.
- The results header is a sticky row inside the scroll container — outside it, the scrollbar offsets every value from its label.

### The watchlist row

- The desktop row is a two-tier hierarchy, not equal columns: price and 24h change are the scan pair, market cap/liquidity/holders one secondary cluster.
- Numeric columns are measured to the wider of their header and their widest value; the token column takes the remainder.
- The mint trails the name on the same line and hides with its copy button below 900px.
- The mobile row toggles its drawer; the desktop table is not an accordion. One drawer open at a time, and it stays rendered but inert while collapsed.
- `formatPriceCompact` caps at nine characters using subscript-zero notation ($0.0₄5545), keeping the fixed price column stable.
- A 24h change that rounds to 0.00% renders neutral and unsigned through `changeTone` and `formatChange`: a stablecoin that hasn't moved is not up.
- The `<tr>` transitions `background-color` only, never the `transition-colors` shorthand. `divide-y` leaves the last row's border-color unset at `currentColor`, invisible only because its width is 0.
- The desktop sort control is the header itself: a full-cell button cycling desc → asc → saved order, with `aria-sort` on the `th`. Its caret is absolutely positioned in the cell's right padding, never inline. The active caret is `text-ink`.
- Mobile sorts from a band above the cards: a native `<select>` of the five keys plus "Saved order", and a direction toggle disabled while unsorted.
- A refresh re-sorts under the active sort, so a row can visibly jump; a reload starts from the saved order.

### Result rows

- Jupiter's order is kept, never re-grouped or re-sorted; only the exact match moves. A verified/liquid split was tried and removed — the list already arrives risk-stratified.
- Name searches send `limit=50` and drop null-liquidity rows in `searchUpstream` — those render blank in every column, so they are empty results, not weak ones. Not an asset-class rule: a filter on the `rwa` tag was rejected because it deletes `NVDAx` and `TSLAx`, which pass on their own numbers.
- Mint queries (`isMintQuery`) skip both the filter and `limit` — `fetchTokens` rehydrates through the same shape, so filtering would strand a watched token in storage. The route caps batches at 100..
- The star is both the add control and the membership signal. One target that states the fact and changes it cannot disagree with itself, which a badge plus a button can.
- The star's column is reserved in the resting row so nothing shifts on hover.
- Adding uses the token object search already returned. No second fetch.
- Unverified and thin tokens are addable. The row says what a token is; it does not decide. Absent verification is itself the signal — no reserved glyph slot — except where there are no live metrics, since unknown verification is not the same claim as unverified.
- The mint reveal on hover or focus is desktop-only.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export.

## How to work here

This is a small app. Keep it small.

- Build exactly what was asked. No extra flags, config, routes, or "while I was in there" features.
- A user-facing change starts with the interaction, not the code. Before writing any, settle: where it renders and what moves when it appears; what triggers it; every state (empty, loading, error, too many results); the mistake it has to stop the user making; what happens right after the primary action. Recommend an option for each and get agreement in the same message.
- A one-line request ("add a search bar") names a mechanism, not a behavior. Unspecified is not unambiguous — absent behavior is a question to ask, not a gap to fill with the nearest default.
- Server Components by default; `"use client"` only where interactivity actually needs it.
- No `useMemo` / `useCallback` without a stated reason.
- No new abstraction until the same code exists in three places. A focused leaf component that removes duplicated row UI is the exception; no `utils/`, `hooks/`, or generic wrappers for one caller.
- Page-specific components stay flat in `app/`; shared row controls live in `components/`. Splitting a file past ~300 lines along a seam that already exists is fine.
- `use-token-search.ts` owns the whole search half and takes `onToggle` as its one tie back to membership. It is a deliberate exception to the no-one-caller-wrapper rule — `watchlist.tsx` was running two unrelated state machines. Don't fold it back in, and don't start a `hooks/` directory.
- One source of truth for membership: the ordered entry list in `watchlist.tsx`. Live metrics are a separate mint-keyed map that holds no membership. Never a second list, and never an effect syncing two.
- No tests unless asked. No mocks, fixtures, or scaffolding.
- Comments for non-obvious logic and short function-level summaries — nullable API fields, Jupiter quirks, an invariant that isn't visible from the code. Don't annotate lines with what they already say.
- No new dependencies without saying why one is needed.
- Follow the patterns already in the file you're editing rather than importing a better one.
- Name functions by the layer they sit in, not the vendor they call: `searchUpstream` (server, hits Jupiter) vs `searchTokens` (browser, hits `/api/tokens`).
- Multi-file change: once the behavior is settled, list the files and a one-line purpose each, then write the code. Skip preambles and alternative architectures — that applies to the implementation, never to the product decisions above it.
- Ambiguous implementation detail? Pick the simplest option that fits existing patterns and state the assumption in one sentence. Ask only when the readings lead to materially different work. This governs code choices, not user-facing behavior.

## Keeping this file current

Treat this file like code. It only earns its length by changing behavior.

- When something durable gets settled — a decision, a constraint, an API quirk, a correction to how I work here — add it as one line in the section it belongs to, before the session ends. Say what changed; don't ask first.
- Rewrite or delete the line that was wrong rather than stacking a new one beside it.
- The test for every line: would removing it cause a mistake? If not, cut it. This file loads in full every session, so length costs attention.
- Only what a session can't infer from the code. Not a changelog, not what we tried and dropped, not the obvious.
- `README.md` is the human-facing companion: the same decisions written as reasoning for a reviewer. Both carry the build-status line — update both.

## Verification

Any UI change gets verified in a real browser before you call it done — Playwright MCP or the Chrome extension against `next dev`. Exercise the flow you touched, check the console for errors, and say what you saw. "It compiles" is not verification.
