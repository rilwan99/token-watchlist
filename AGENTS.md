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
4. **Remove** — one click, no confirmation.
5. **Sort** — client-side on price change, market cap, liquidity, volume, holders.
6. **Timeframe** — 5m / 1h / 6h / 24h across all change columns. No refetch; all four arrive in one response.
7. **Refresh** — manual button plus "last updated" timestamp.

Built: load, search, refresh. Not built yet: add, remove, sort, the timeframe switch (the table is pinned to 24h at `app/token-table.tsx:9`), and the mobile card layout. Update this line as they land.

## Settled decisions

### Data and storage

- Storage holds mint addresses and a `seeded` flag. Market data is always fetched fresh.
- SOL is seeded on the first visit only, tracked by that flag rather than by an empty list, so removed SOL stays removed. An empty watchlist is valid and renders the empty view.
- Snapshot at load, not a live feed. No polling; refresh is manual. Spinner while loading.
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
- Escape is handled on the search wrapper, not the input, so it reaches the panel's tab stops too. Those go `inert` on close, so dismissing must return focus to the input. The query is kept; the next keystroke reopens.
- The results header is a sticky row inside the scroll container — outside it, the scrollbar drops every value ~15px left of its label.

### Result rows

- Jupiter's order is kept, never re-grouped or re-sorted; only the exact match moves. A verified/liquid split under an "Unverified · low liquidity" divider was tried and removed: the list already arrives risk-stratified. Don't reintroduce a grouping rule coarser than the ranking it overrides.
- Name searches send `limit=50` and drop null-liquidity rows in `searchUpstream` — those render blank in every column the app has, so they are empty results, not weak ones. Not an asset-class rule: a filter on the `rwa` tag was rejected because it deletes `NVDAx` and `TSLAx`, which pass on their own numbers.
- Mint queries (`isMintQuery`) skip both the filter and `limit` — the caller named exact tokens, and `fetchWatchlist` rehydrates through the same shape, so filtering would strand a watched token in storage. The route caps batches at 100.
- The exact-symbol pin means "this is what you typed", not "this is safe": accent border and `Exact` tag in accent ink only when the token is also verified, neutral otherwise, suppressed entirely when several unverified tokens share the symbol.
- Every row shows whether the token is already on the watchlist — a short watchlist sits entirely behind the open panel.
- Row grid: identity, market cap, 24h volume, a vertical rule, liquidity, organic. Market cap and volume are compared against each other in primary ink; liquidity and organic are checked against a threshold in secondary, and liquidity turns `text-down` below it. Units live in the header row, not per line.
- Unverified rows read recessive: muted symbol, 40%-opacity icon, launchpad tag. No pill — one fixed-width slot holds `✓` or `?` so nothing after it shifts. It always renders a glyph; this is the row's primary verification signal, and absence is too quiet to carry it.
- The mint is off the row by default; hover or keyboard focus swaps the name line for the truncated address plus a copy button. Opacity, not `display` — the button is the row's only tab stop. A base58 query (32-44 chars) shows the address on every row without hover.
- `formatCompactUsd` is three significant figures, so every cell caps at five characters and the right-aligned edge holds. Missing values are an em dash, never `$0`.
- The panel stays open after an add so several tokens can go in one pass; the row itself flips to added.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export.

## How to work here

This is a small app. Keep it small.

- Build exactly what was asked. No extra flags, config, routes, or "while I was in there" features.
- A user-facing change starts with the interaction, not the code. Before writing any, settle: where it renders and what moves when it appears; what triggers it; every state (empty, loading, error, too many results); the mistake it has to stop the user making; what happens right after the primary action. Recommend an option for each and get agreement in the same message.
- A one-line request ("add a search bar") names a mechanism, not a behavior. Unspecified is not unambiguous — absent behavior is a question to ask, not a gap to fill with the nearest default. Shipping the literal reading is how the search panel got built inline and shoved the watchlist 344px down the page.
- Server Components by default; `"use client"` only where interactivity actually needs it.
- No `useMemo` / `useCallback` without a stated reason.
- No new abstraction until the same code exists in three places. No `utils/`, `hooks/`, or generic wrappers for one caller.
- Components sit flat in `app/`, one file each: `watchlist.tsx` owns state and layout, `search-results.tsx` and `token-table.tsx` render. Splitting a file past ~300 lines along a seam that already exists is fine; inventing a `components/` directory or shared prop types to hold them is not.
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
