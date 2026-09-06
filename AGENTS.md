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
5. **Sort** — client-side on price change, market cap, liquidity, volume, holders.
6. **Timeframe** — 5m / 1h / 6h / 24h across all change columns. No refetch; all four arrive in one response.
7. **Refresh** — manual button plus "last updated" timestamp.

Built: load, search, add, remove with undo, refresh. Not built yet: sort, the timeframe switch (the table is pinned to 24h at `app/token-table.tsx:14`), and the mobile card layout. Update this line as they land.

## Settled decisions

### Data and storage

- Storage holds identity only - mint, symbol, name, icon URL, in saved order - plus a `seeded` flag. Never price, market cap, liquidity or holders: a cached number is wrong the moment it is written.
- Storage is written only by an add or a remove, never by a fetch. That is what stops a response that was already in flight from resurrecting a row the user just removed.
- Rows paint from storage on the first commit, with dashes in the numeric columns, and the fetch fills them in. Nothing waits on the network to know what is on the list, so there is no full-page spinner - only the Refresh button's own label and a `Refreshing...` state.
- The mint is the key everywhere. Symbols collide - `unipcs` returns four tokens whose symbol or name is some arrangement of UNIPCS and BONKGUY - so keying by symbol adds the wrong token and invents duplicates.
- A stored mint Jupiter no longer returns keeps its row and its stored name, with dashes for every metric. Dropping it silently would lose a token the user chose.
- Malformed, absent or half-written storage falls back to an empty list rather than throwing, and duplicate mints are collapsed on the way in. Two tabs are last-write-wins; that is acceptable, crashing is not.
- SOL is seeded on the first visit only, tracked by that flag rather than by an empty list, so removed SOL stays removed. An empty watchlist is valid and renders the empty view - one line of copy, no header row over nothing.
- Snapshot at load, not a live feed. No polling; refresh is manual. A failed refresh reports itself beside the timestamp and leaves the table standing. A temporary remove undo supersedes the error in that slot; the error returns when undo expires.
- Removing offers an eight-second undo for the last row only. It reinserts the saved entry at its original index through the normal storage commit; a later add, remove, or undo clears it.
- One anonymous user, one watchlist, one device. Solana only. Soft cap ~50 tokens, under the 100-mint batch limit.
- Sort and timeframe are session state, not persisted.
- Desktop table, mobile cards. Same data and flows; both primary.

### The search slot

- The slot sits in normal flow, opens on the first character typed, collapses when the field is emptied or dismissed. Focus alone opens nothing. Two hard constraints, both failed once: results never cover the watchlist, and the page never moves as results arrive or change count. The slot opening on a keystroke is the one permitted shift.
- The slot is a fixed 416px in every open state and the panel fills it at 412px. A content-sized panel jumps ~370px a debounce after a keystroke; a content-sized card leaves ~350px of gap above the watchlist. Growing the slot to fit 20 rows pushes the table off the fold.
- Four states, all filling the panel: loading (skeleton rows), results, no matches (`No tokens match "<query>"` plus a line suggesting a symbol, a name, or a mint), failed (a message distinct from no-matches plus a Retry that re-runs the query). An empty or failed search never closes the panel.
- 250ms debounce, 1-character minimum, `AbortController` cancelling superseded requests, no submit button. One character is a real search — Jupiter ranks what it returns, so `s` gives SOL, Sonic, SPYx.
- A settled answer persists dimmed while a newer query loads, and "no tokens match" is an answer too. A failure is not: its Retry would sit there live, inviting a second request mid-flight. So the skeleton shows only when there is nothing to preserve — the first search of a session, or the one after a failure.
- The no-match message and the exact pin read the query carried on the `ready` state, never the live input; during the debounce the two differ.
- Skeleton rows reuse `GRID` and the real cell classes at the 53px a real row measures, so results land without moving a column or row edge. Eight, so the last clips as a scrolling list does. `aria-hidden`, with an `sr-only` "Searching...".
- Escape is handled on the search wrapper, not the input, so it reaches the panel's tab stops too. Those go `inert` on close, so dismissing must return focus to the input. Escape empties the field, which closes the panel through `open`. An outside click dismisses without clearing, and the next keystroke reopens.
- Arrow up/down move a highlight through `arrange`'s order, wrapping at both ends, and Enter toggles the highlighted row's star without closing the panel. The highlight starts at nothing, so Enter on a fresh search adds nothing. Pointer and keyboard share it: `mouseenter` moves the index, so the two never disagree about which row Enter means. `arrange` is exported for this - the key handler lives on the wrapper with the input, and both sides have to agree on what row 3 is.
- The results header is a sticky row inside the scroll container — outside it, the scrollbar drops every value ~15px left of its label.

### Result rows

- Jupiter's order is kept, never re-grouped or re-sorted; only the exact match moves. A verified/liquid split under an "Unverified · low liquidity" divider was tried and removed: the list already arrives risk-stratified. Don't reintroduce a grouping rule coarser than the ranking it overrides.
- Name searches send `limit=50` and drop null-liquidity rows in `searchUpstream` — those render blank in every column the app has, so they are empty results, not weak ones. Not an asset-class rule: a filter on the `rwa` tag was rejected because it deletes `NVDAx` and `TSLAx`, which pass on their own numbers.
- Mint queries (`isMintQuery`) skip both the filter and `limit` — the caller named exact tokens, and `fetchTokens` rehydrates through the same shape, so filtering would strand a watched token in storage. The route caps batches at 100.
- The exact-symbol pin means "this is what you typed", not "this is safe": accent border and `Exact` tag in accent ink only when the token is also verified, neutral otherwise, suppressed entirely when several unverified tokens share the symbol.
- A star in the search results' trailing fixed column is both the add control and the membership signal - filled means saved, outline means not, clicking toggles. One target that states the fact and changes it cannot disagree with itself, which a badge plus a separate button can. It replaced an `On list` text badge. A short watchlist sits entirely behind the open panel, so the row has to carry this itself.
- The watchlist row already establishes membership, so its trailing fixed column holds an explicit `×` remove button instead. It fades in on row hover or keyboard focus above 480px, stays visible below it at a 44px target, and turns danger-colored on hover or focus.
- The star's column is reserved in the resting row, so nothing shifts on hover. A filled star never hides; an empty one fades in on hover or focus above 480px and stays visible below it, where there is no hover and the target is 44px. Opacity, not `display` - it is a tab stop, and tabbing to it is how a keyboard reveals it.
- Adding uses the token object search already returned. No second fetch, and the row is complete before the next refresh.
- Unverified and thin tokens are addable. The row says what a token is; it does not decide. The `?` glyph, the launchpad tag and the danger-colored liquidity all follow the token into the watchlist row, where they are read from then on - except when there are no live metrics, since unknown verification is not the same claim as unverified.
- Row grid: identity, market cap, 24h volume, a vertical rule, liquidity, organic. Market cap and volume are compared against each other in primary ink; liquidity and organic are checked against a threshold in secondary, and liquidity turns `text-down` below it. Units live in the header row, not per line.
- Unverified rows read recessive: muted symbol, 40%-opacity icon, launchpad tag. No pill — one fixed-width slot holds `✓` or `?` so nothing after it shifts. It always renders a glyph; this is the row's primary verification signal, and absence is too quiet to carry it.
- The mint is off the row by default; hover or keyboard focus swaps the name line for the truncated address plus a copy button. Opacity, not `display` — the button is the row's only tab stop. A base58 query (32-44 chars) shows the address on every row without hover.
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
- Page-specific components stay flat in `app/`: `watchlist.tsx` owns state and layout, while `search-results.tsx` and `token-table.tsx` render it. Shared row controls live in `components/`: `star-button.tsx`, `token-icon.tsx`, and `token-status.tsx`. Splitting a file past ~300 lines along a seam that already exists is fine.
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
