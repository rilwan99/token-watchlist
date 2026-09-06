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

Built: load from storage, search with animated mobile results, add, remove with undo, manual refresh, the unified dark watchlist card, desktop table, mobile accordion with animated details, sort, and the desktop row's mint with hover-copy. Every flow above is in. Update this line as anything lands. The timeframe switch is cut, not pending — every change column is 24h.

## Settled decisions

### Data and storage

- Storage holds identity only - mint, symbol, name, icon URL, in saved order - plus a `seeded` flag. Never price, market cap, liquidity or holders: a cached number is wrong the moment it is written.
- Storage is written only by an add or a remove, never by a fetch. That is what stops a response that was already in flight from resurrecting a row the user just removed.
- Rows paint from storage on the first commit, with dashes in the numeric columns, and the fetch fills them in. Nothing waits on the network to know what is on the list, so there is no full-page spinner - only the refresh button's disabled, spinning-icon state.
- The mint is the key everywhere. Symbols collide - `unipcs` returns four tokens whose symbol or name is some arrangement of UNIPCS and BONKGUY - so keying by symbol adds the wrong token and invents duplicates.
- `isMintAddress` in `app/lib/format.ts` is the only base58 mint check. Storage narrowing, the route's batch guard, `isMintQuery`, and the search row's address reveal all call it; it once existed as four copied regex literals. Never inline a fresh one.
- A stored mint Jupiter no longer returns keeps its row and its stored name, with dashes for every metric. Dropping it silently would lose a token the user chose.
- Malformed, absent or half-written storage falls back to an empty list rather than throwing, and duplicate mints are collapsed on the way in. Two tabs are last-write-wins; that is acceptable, crashing is not.
- SOL is seeded on the first visit only, tracked by that flag rather than by an empty list, so removed SOL stays removed. An empty watchlist is valid and renders the empty view - one line of copy, no header row over nothing.
- Snapshot at load, not a live feed. No polling; refresh is manual. A failed refresh reports itself beside the timestamp and leaves the table standing. A temporary remove undo supersedes the error in that slot; the error returns when undo expires.
- Removing offers an eight-second undo for the last row only. It reinserts the saved entry at its original index through the normal storage commit; a later add, remove, or undo clears it.
- One anonymous user, one watchlist, one device. Solana only. Soft cap ~50 tokens, under the 100-mint batch limit.
- Sort is session state, not persisted. It lives in `token-table.tsx` beside the accordion's `openMint`, not in `watchlist.tsx`: it is a view over the entry list, and nothing outside the two layouts reads it. `sortEntries` returns the saved order untouched when the sort is null, so storage order stays the one source of order.
- Five sortable keys, all numeric and all live: price, 24h change, market cap, liquidity, holders. Volume is not among them — it has no desktop column, and adding a seventh would re-measure every fixed width. Nulls sort last in both directions, so a token Jupiter no longer returns cannot win "cheapest"; ties keep the saved order through a stable sort.
- A refresh re-sorts the new numbers under the active sort, so a row can visibly jump; a reload starts from the saved order. Adds land in their sorted position, and a remove-undo reinserts at the storage index while the view re-sorts around it.
- 24h is the only timeframe, by decision. Jupiter returns 5m/1h/6h in the same response; `toToken` normalizes only `stats24h`, and `Token.stats24h` is a single `TokenStats`, not a keyed map. There is no switch and no `Timeframe` type — don't reintroduce either as scaffolding.
- Desktop table and mobile cards are separate render paths over the same data and flows, enclosed by one bounded surface card with a desktop header band and a manual-refresh footer. The accordion stays below 640px; empty lists keep the card and footer but omit the header band.
- A populated card is exactly as tall as its rows: no minimum on either render path, so one token is a short card and each added token grows it by one row. A floor there read as blank rows between the last token and the footer — a one-token watchlist was 214px of dead surface.
- The empty state's body is `min-h-[105px]`, the desktop header band plus one row, so removing the last token moves the footer 0.5px on desktop and 4px on mobile, where the sort band is 45px rather than 41px. It was 320px, which dropped the empty copy four rows down the page the moment the list emptied. The copy is ~48px and the minimum only sets a floor, so a narrow phone that wraps the second line still grows.
- The page column caps at 1120px, centred, so the search row and the card share one width and one left edge. The table never scrolls horizontally — the accordion covers every width the six columns cannot fit.
- A list taller than the viewport scrolls the document. No internal scroll container, no pagination, no virtualization: 50 rows is nothing to render, and a nested scroller would fight touch scrolling, add a scrollbar that shifts the fixed numeric columns, and break the accordion's `scrollIntoView`. The `<thead>` is `sticky top-0 z-10` instead, because the units live in those labels and nothing else on the page carries them; ~9 rows fill an 800px viewport. The card must stay `overflow-clip` — `overflow-hidden` makes it a scroll container and the sticky header silently stops sticking.
- The undo affordance sits in the status strip beside the search input, which scrolls away on a long list. Accepted: past ~9 tokens a removal's undo can expire off-screen. A toast was rejected as a new pattern for a list capped at 50.
- Accordion state is session state too, and only one card is open at a time.
- The dark palette is role-based: ground is the page, surface is a card, raised is bands and hover, edge and line separate surfaces and rows, ink/muted/faint distinguish primary/secondary/tertiary text, accent is lime selection and verification, warn is amber liquidity risk, and up/down are reserved for price direction.

### The search slot

- The slot sits in normal flow, opens on the first character typed, collapses when the field is emptied or dismissed. Focus alone opens nothing. Two hard constraints, both failed once: results never cover the watchlist, and the page never moves as results arrive or change count. The slot opening on a keystroke is the one permitted shift.
- The slot is fixed to five result rows in every open state: 269px below 480px, where the header is hidden, and 297px at larger widths for the header plus five rows. The panel fills it. A content-sized panel jumps a debounce after a keystroke; growing the slot to fit all results pushes the table off the fold.
- On mobile, the results panel fades and slides down as the reserved slot opens, and reverses on close. The height transition still controls the one permitted page shift; reduced-motion users get neither transition.
- Four states, all filling the panel: loading (skeleton rows), results, no matches (`No tokens match "<query>"` plus a line suggesting a symbol, a name, or a mint), failed (a message distinct from no-matches plus a Retry that re-runs the query). An empty or failed search never closes the panel.
- 250ms debounce, 1-character minimum, `AbortController` cancelling superseded requests, no submit button. One character is a real search — Jupiter ranks what it returns, so `s` gives SOL, Sonic, SPYx.
- A settled answer persists dimmed while a newer query loads, and "no tokens match" is an answer too. A failure is not: its Retry would sit there live, inviting a second request mid-flight. So the skeleton shows only when there is nothing to preserve — the first search of a session, or the one after a failure.
- The no-match message and the exact pin read the query carried on the `ready` state, never the live input; during the debounce the two differ.
- Skeleton rows reuse `GRID` and the real cell classes at the 53px a real row measures, so results land without moving a column or row edge. Five fill the viewport, matching the visible results before the list scrolls. A successful answer with fewer than five rows gets a muted `N matches · End of results` terminal row immediately after its last token; the reserved space stays intentional without inventing recommendations. `aria-hidden`, with an `sr-only` "Searching...".
- Escape is handled on the search wrapper, not the input, so it reaches the panel's tab stops too. Those go `inert` on close, so dismissing must return focus to the input. Escape empties the field, which closes the panel through `open`. An outside click dismisses without clearing, and the next keystroke reopens.
- Arrow up/down move a highlight through `arrange`'s order, wrapping at both ends, and Enter toggles the highlighted row's star without closing the panel. The highlight starts at nothing, so Enter on a fresh search adds nothing. Pointer and keyboard share it: `mouseenter` moves the index, so the two never disagree about which row Enter means. `arrange` is exported for this - the key handler lives on the wrapper with the input, and both sides have to agree on what row 3 is.
- The results header is a sticky row inside the scroll container — outside it, the scrollbar drops every value ~15px left of its label.

### The watchlist row

- `token-table.tsx` picks between two render paths over one entry list: `token-card.tsx` below 640px and `token-row.tsx` above it. Only one is in the flow at once. The parent owns the accordion's `openMint`; the two children own only their own markup.
- The desktop row is a two-tier hierarchy, not six equal columns. Price (15px, ink) and 24h change (14px, semantic) are the scan pair; market cap, liquidity and holders are one secondary cluster at 12px muted, set off by 24px of extra lead on market cap. Headers are sentence case at 11px faint — never `uppercase`, which widened "Market cap" past its cell until it ran into "Liquidity".
- Numeric columns are sized to the wider of their header and their widest value plus padding, measured rather than rounded up; the token column takes the remainder. At 640px that remainder is ~110px, so the symbol truncates and `TokenStatus` takes `tagClassName` to drop the launchpad tag under 768px. Without that the tag ate the whole symbol. Widen a numeric column and you take it from the symbol.
- The desktop row's mint trails the name on the same line, faint 11px mono after a `·`, with a copy button that fades in on row hover or focus like the `×` does. Both are hidden below 900px: the token column is the remainder of a fixed grid, and under that width the ~103px address leaves the name too little to read. The copy button's width is reserved while transparent, so the name truncates at the same point hovered or not. It is a seventh column's worth of information in a line that was already there — never give the mint a column, it comes straight out of the symbol.
- The mobile collapsed row carries an icon, symbol, verified check when applicable, truncated name, stacked price/24h change, and an up/down chevron; the whole row toggles its drawer. The desktop table remains non-accordion.
- The mobile drawer is visually joined under its row with a left accent rule. Its order is market-cap/liquidity/volume stat grid, wrapping trust/context chips (verification, holders and launchpad where available), then mint/copy/remove utilities. The remove icon is bordered red only and every missing metric reads `—`.
- The mobile panel expands and collapses over 200ms with the same ease-out rhythm as search, and its content fades and slides with it. It stays rendered but inert and hidden from assistive technology while collapsed.
- `formatPriceCompact` caps at nine characters using subscript-zero notation ($0.0₄5545) in both price columns, keeping the desktop's fixed 98px price column stable.
- A 24h change that rounds to 0.00% renders neutral and unsigned in both layouts through `changeTone` and `formatChange`: a stablecoin that hasn't moved is not up.
- The desktop sort control is the header itself: each numeric label is a full-cell button cycling desc → asc → saved order, with `aria-sort` on the `th`. Its caret is absolutely positioned in the cell's own right padding, never inline — every numeric column is measured to the wider of its header and its widest value, so an inline glyph would take ~12px from the token column, which already truncates the symbol at 640px. The label's right edge stays aligned with the numbers below it and nothing moves when the sort changes. An idle header looks inert, so an inactive column fades a faint down caret in on hover or keyboard focus - the direction that first click applies; the active column's caret is `text-ink` and always visible, and hover never previews the next direction. Active reads `text-ink`, not accent: accent stays selection and verification.
- The accordion has no header row, so mobile sorts from its own band above the cards — a native `<select>` of the five keys plus "Saved order", and a direction toggle disabled while unsorted. Native because the OS picker is the better phone target and it costs no dismissal, focus or outside-click handling. Both layouts read one sort state, so a rotation keeps it.

### Result rows

- Jupiter's order is kept, never re-grouped or re-sorted; only the exact match moves. A verified/liquid split under an "Unverified · low liquidity" divider was tried and removed: the list already arrives risk-stratified. Don't reintroduce a grouping rule coarser than the ranking it overrides.
- Name searches send `limit=50` and drop null-liquidity rows in `searchUpstream` — those render blank in every column the app has, so they are empty results, not weak ones. Not an asset-class rule: a filter on the `rwa` tag was rejected because it deletes `NVDAx` and `TSLAx`, which pass on their own numbers.
- Mint queries (`isMintQuery`) skip both the filter and `limit` — the caller named exact tokens, and `fetchTokens` rehydrates through the same shape, so filtering would strand a watched token in storage. The route caps batches at 100.
- The exact-symbol pin means "this is what you typed", not "this is safe": accent border and `Exact` tag in accent ink only when the token is also verified, neutral otherwise, suppressed entirely when several unverified tokens share the symbol.
- A star in the search results' trailing fixed column is both the add control and the membership signal - filled means saved, outline means not, clicking toggles. One target that states the fact and changes it cannot disagree with itself, which a badge plus a separate button can. It replaced an `On list` text badge. A short watchlist sits entirely behind the open panel, so the row has to carry this itself. Tap-the-row-to-add on mobile was considered and rejected: the action is a toggle, so a stray tap in a scrolling 269px slot would remove a saved token with no undo in the panel, and row-tap already means "expand" on the watchlist card one screen over.
- The desktop table's trailing fixed column holds an explicit `×` remove button, revealed on row hover or keyboard focus. The mobile drawer instead has an always-visible 36px bordered remove icon beside copy.
- The star's column is reserved in the resting row, so nothing shifts on hover. A filled star never hides; an empty one fades in on hover or focus above 480px and stays visible below it, where there is no hover and the target is 44px. Opacity, not `display` - it is a tab stop, and tabbing to it is how a keyboard reveals it.
- Adding uses the token object search already returned. No second fetch, and the row is complete before the next refresh.
- Unverified and thin tokens are addable. The row says what a token is; it does not decide. The absent verified check, launchpad tag and amber thin-liquidity warning all follow the token into the watchlist row, where they are read from then on - except when there are no live metrics, since unknown verification is not the same claim as unverified.
- Row grid: identity, market cap, 24h volume, a vertical rule, liquidity, organic. Market cap and volume are compared against each other in primary ink; liquidity and organic are checked against a threshold in secondary, and thin liquidity adds an amber warning triangle before its secondary-ink value. Units live in the header row, not per line.
- Unverified rows read recessive: muted symbol, 40%-opacity icon, and launchpad tag. Verification is an accent check only when asserted by live data; its absence is the unverified signal, with no reserved glyph slot.
- The mint is off the row by default; hover or keyboard focus swaps the name line for the truncated address plus a copy button. Opacity, not `display` — the button is the row's only tab stop. A base58 query (32-44 chars) shows the address on every row without hover.
- Copying a mint from a search row is desktop-only, by decision. Touch has no hover, so below 480px the row keeps the name and the star is its only tap target. Copying on a phone lives in the watchlist card's accordion panel, where there is room for it. Don't add a mobile reveal to the search row.
- `formatCompactUsd` is three significant figures, so every cell caps at five characters and the right-aligned edge holds. Missing values are an em dash, never `$0`.
- The panel stays open after an add and the query is kept, so several tokens can go in one pass; the row's star flips to filled.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export.

## How to work here

This is a small app. Keep it small.

- Build exactly what was asked. No extra flags, config, routes, or "while I was in there" features.
- A user-facing change starts with the interaction, not the code. Before writing any, settle: where it renders and what moves when it appears; what triggers it; every state (empty, loading, error, too many results); the mistake it has to stop the user making; what happens right after the primary action. Recommend an option for each and get agreement in the same message.
- A one-line request ("add a search bar") names a mechanism, not a behavior. Unspecified is not unambiguous — absent behavior is a question to ask, not a gap to fill with the nearest default. Shipping the literal reading is how the search panel got built inline and shoved the watchlist 344px down the page.
- Server Components by default; `"use client"` only where interactivity actually needs it.
- No `useMemo` / `useCallback` without a stated reason.
- No new abstraction until the same code exists in three places. A focused leaf component that removes duplicated row UI is the exception; no `utils/`, `hooks/`, or generic wrappers for one caller.
- Page-specific components stay flat in `app/`: `watchlist.tsx` owns membership state and layout, while `search-results.tsx` and `token-table.tsx` render it, the latter delegating to `token-card.tsx` and `token-row.tsx`. Shared row controls live in `components/`: `star-button.tsx`, `token-icon.tsx`, and `token-status.tsx`. Splitting a file past ~300 lines along a seam that already exists is fine.
- `use-token-search.ts` owns the whole search half - query, debounce, `AbortController`, dismissal, retry, and the arrow/Enter highlight - and takes `onToggle` as its one tie back to membership. It is a deliberate exception to the no-one-caller-wrapper rule: `watchlist.tsx` was running two unrelated state machines in 265 lines. Don't fold it back in, and don't start a `hooks/` directory - it sits flat in `app/` like everything else.
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
