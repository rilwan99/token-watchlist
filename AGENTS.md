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

Jupiter Tokens API V2: `GET https://api.jup.ag/tokens/v2/search?query={query}`, header `x-api-key`.

- `query` takes a symbol, name, or mint.
- Comma-separated mints return in one response, max 100. This is how the watchlist loads.
- Symbol/name search returns 20 results by default.
- A mint matches only in full. A partial address returns zero results, so there is no partial-address state to render.
- `isVerified` is `null`, not `false`, on unverified tokens.
- There is no total volume field. 24h volume is `stats24h.buyVolume + stats24h.sellVolume`, and one side can be null on its own.
- `launchpad` ("pump.fun", "letsbonk.fun", null) and `organicScoreLabel` ("high" / "medium" / "low") are first-class fields. Never infer either — mint suffixes lie in both directions.

The fields used are typed in `app/lib/types.ts` and normalized in `app/lib/tokens.ts`. Nearly every one is nullable upstream — normalize to `null` on the way in, render a dash, never `NaN` or `undefined`.

## Flows

1. **Load** — rehydrate mints from storage, one batch request, render.
2. **Search** — by symbol, name, or mint. Debounced as-you-type into the results slot. Each row is a grid: identity, market cap, 24h volume, a rule, liquidity, organic. Units live in one header row, not repeated per line.
3. **Add** — from the result row; row flips to added state; duplicates blocked.
4. **Remove** — one click, no confirmation.
5. **Sort** — client-side on price change, market cap, liquidity, volume, holders.
6. **Timeframe** — 5m / 1h / 6h / 24h across all change columns. No refetch; all four windows arrive in the same response.
7. **Refresh** — manual button plus "last updated" timestamp.

This list is the target, not the current state. Built: load, search, refresh. Not built yet: add, remove, sort, the timeframe switch (the table is pinned to 24h at `app/token-table.tsx:9`), and the mobile card layout. Update this line as they land.

## Settled decisions

- SOL (`So11111111111111111111111111111111111111112`) seeded on first visit only, tracked by a separate `seeded` flag. Removed SOL stays removed. Empty watchlist is valid and renders the empty view.
- Storage holds mint addresses and the `seeded` flag only. Market data always fetched fresh.
- One anonymous user, one watchlist, one device. No accounts, no sync, no server-side persistence.
- Snapshot at load, not a live feed. No polling.
- Spinner while loading. Sort and timeframe are session state, not persisted.
- Search results occupy a slot in normal flow that opens on the first character typed and collapses when the field is emptied or dismissed, fixed height while open. Focus alone opens nothing — the placeholder already says what to type. Two hard constraints, both failed once already: results must never cover the watchlist, and the page must not move as results arrive or change count. The one permitted shift is the slot opening, tied to the user's keystroke. The slot is 416px — about seven rows. Growing it to fit all twenty pushes the table off the fold, which is the failure the constraints exist to prevent.
- The slot height is fixed at the cap for every open state, and the panel inside fills it — 416px slot, 412px panel, in all four states. A content-sized panel would jump ~370px a debounce after a keystroke, untied to any user action. A content-sized *card* in a fixed slot avoids that but leaves the short states floating above ~350px of nothing, which reads as a gap between the panel and the watchlist. Filling the slot is what satisfies both. Loading fills it with skeleton rows; no-match and failure centre their message in it.
- Skeleton rows reuse `GRID` and the same cell classes as a real row and pin the 53px height a real row measures, so results landing swap content without moving a column or a row edge. Eight rows overrun the panel so the last clips exactly as a scrolling result list does. They are `aria-hidden`, with an `sr-only` "Searching..." carrying the state.
- Escape is handled on the search wrapper, not the input, so it also reaches the panel's own tab stops (row copy buttons, Retry). Those go `inert` as the panel closes, so dismissing must return focus to the input or it lands on nothing. Dismissing keeps the query; the next keystroke reopens.
- The results header lives inside the scroll container as a sticky row, not above it. Outside, the scrollbar narrows the rows and every value lands ~15px left of its own label.
- Search fires as-you-type: 250ms debounce, 1-character minimum, `AbortController` cancelling superseded requests. No submit button.
- A settled answer persists dimmed while a newer query loads, and "no tokens match" is an answer as much as a list of rows is — it is held too. Tearing it down to a skeleton on every keystroke flashes the whole panel between two near-identical messages. Holding it stays truthful because the message names the query it came from, not the live input. A failure is not an answer and does not persist: its Retry would sit there live, inviting a second request while one is in flight. So the skeleton appears only when there is nothing to preserve — the first search of a session, or the one after a failure.
- One character is a real search, not a prefix guess: Jupiter caps at 20 and ranks them, so `s` returns SOL, Sonic, SPYx and `b` returns WBTC, cbBTC, xBTC. Verified against the live API on 2026-09-06. There is no junk-results reason to hold the panel back to two characters.
- Four panel states, all inside the open panel and all filling it: loading (first search only, skeleton rows), results, no matches (`No tokens match "<query>"` plus a line suggesting a symbol, a name, or a mint), and failed (a message distinct from no-matches plus a Retry that re-runs the same query). An empty or failed search never closes the panel.
- The no-match message and the exact-match pin read the query that produced the results, carried on the `ready` state — not the live input. During the 250ms debounce the two differ, and using the live one tells the user a query was searched before it was.
- Every result row shows whether that token is already on the watchlist. A short watchlist sits entirely behind the open panel, so the row has to say it rather than leaving the user to check the table.
- Search results are grouped, never re-sorted or filtered: the first exact symbol match pins to the top with an accent border and an `Exact` tag, then trusted rows in Jupiter's order, then everything else under an "Unverified · low liquidity" divider. Trusted means verified **and** liquidity at or above `LOW_LIQUIDITY_USD` ($10K); unknown liquidity counts as thin. Jupiter's ordering inside each group is left alone — it already weighs organic score, and the pin is what stops the split burying the token actually typed.
- Two number groups, split by a vertical rule: market cap and volume are read against each other in primary ink; liquidity and organic are checked against a threshold in secondary. Liquidity turns `text-down` below the threshold.
- Unverified rows read recessive: muted symbol, 40%-opacity icon, launchpad tag. No pill — the verified check sits in a fixed-width slot so nothing after it shifts between rows.
- The mint is not on the row by default. Hover or keyboard focus swaps the name line for the truncated address plus a copy button. The swap is opacity, not `display`, because the button has to stay in the tab order — reaching it is what reveals the address, and it is the row's only tab stop.
- A base58 query (32-44 chars) shows the address in place of the name on every row, no hover needed.
- `formatCompactUsd` is three significant figures so every cell caps at five characters and the right-aligned column edge holds. Missing values render as an em dash, never `$0`.
- The panel stays open after an add, so several tokens can be added in one pass. The row itself flips to an added state — that per-row feedback is load-bearing, because a short watchlist sits entirely behind the panel.
- Soft cap ~50 tokens, under the 100-mint batch limit.
- Solana only.
- Desktop table, mobile cards. Same data and flows; both primary.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export.

## How to work here

This is a small app. Keep it small.

- Build exactly what was asked. No extra flags, config, routes, or "while I was in there" features.
- A user-facing change starts with the interaction, not the code. Before writing any, settle: where it renders and what moves when it appears; what triggers it; every state (empty, loading, error, too many results); the mistake it has to stop the user making; what happens right after the primary action. Recommend an option for each and get agreement in the same message.
- A one-line request ("add a search bar") names a mechanism, not a behavior. Unspecified is not unambiguous — for anything a user touches, absent behavior is a question to ask, not a gap to fill with the nearest default. Shipping the literal reading of the sentence is how the search panel got built inline and shoved the watchlist 344px down the page.
- Server Components by default; `"use client"` only where interactivity actually needs it.
- No `useMemo` / `useCallback` without a stated reason.
- No new abstraction until the same code exists in three places. No `utils/`, `hooks/`, or generic wrappers for one caller.
- Components sit flat in `app/`, one file each: `watchlist.tsx` owns state and layout, `search-results.tsx` and `token-table.tsx` render. Splitting a file that has grown past ~300 lines along a seam that already exists is fine; inventing a `components/` directory, shared prop types, or a wrapper to hold them is not.
- No tests unless asked. No mocks, fixtures, or scaffolding.
- Comments for non-obvious logic and short function-level summaries — nullable API fields, Jupiter quirks, an invariant that isn't visible from the code. Don't annotate individual lines with what they already say.
- No new dependencies without saying why one is needed.
- Follow the patterns already in the file you're editing rather than importing a better one.
- Name functions by the layer they sit in, not the vendor they call: `searchUpstream` (server, hits Jupiter) vs `searchTokens` (browser, hits `/api/tokens`). The provider name belongs in comments, not exported names.
- Multi-file change: once the behavior is settled, list the files and a one-line purpose each, then write the code. Skip preambles and alternative architectures — that applies to the implementation, never to the product decisions above it.
- Ambiguous implementation detail? Pick the simplest option that fits existing patterns and state the assumption in one sentence. Ask only when the readings lead to materially different work. This governs code choices, not user-facing behavior.

## Keeping this file current

Treat this file like code. It only earns its length by changing behavior, so edit it when a session proves it wrong, stale, or incomplete.

- When something durable gets settled — a decision, a constraint, an API quirk, a correction to how I work here — add it as one line in the section it belongs to, before the session ends. Say what changed; don't ask first.
- Rewrite or delete the line that was wrong rather than stacking a new one beside it.
- The test for every line: would removing it cause a mistake? If not, cut it. This file loads in full every session, so length costs attention and a bloated file gets skimmed.
- Only what a session can't infer from the code. Not a changelog, not what we tried and dropped, not the obvious.
- `README.md` is the human-facing companion: the same decisions written as reasoning for a reviewer. Decisions stay here as one-line constraints; the prose explaining them goes there. Both carry the build-status line — update both.

## Verification

Any UI change gets verified in a real browser before you call it done — Playwright MCP or the Chrome extension against `next dev`. Exercise the flow you touched, check the console for errors, and say what you saw. "It compiles" is not verification.
