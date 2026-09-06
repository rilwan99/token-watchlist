<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Token watchlist

Single-page Solana token watchlist: search, add, view market data, remove. Survives reload.

React 19 + TypeScript on Next.js 16 App Router, Tailwind v4. No state library, no component library, no database.

## Data source

Jupiter Tokens API V2: `GET https://api.jup.ag/tokens/v2/search?query={query}`, header `x-api-key`.

- `query` takes a symbol, name, or mint.
- Comma-separated mints return in one response, max 100. This is how the watchlist loads.
- Symbol/name search returns 20 results by default.

Fields used: `id` (mint), `name`, `symbol`, `icon`, `isVerified`, `organicScore`, `usdPrice`, `mcap`, `liquidity`, `holderCount`, `stats5m|1h|6h|24h` (each with `priceChange`, `buyVolume`, `sellVolume`). Nearly all are nullable — render a dash, never `NaN` or `undefined`.

## Flows

1. **Load** — rehydrate mints from storage, one batch request, render.
2. **Search** — by symbol, name, or mint. Results show verified badge, organic score, liquidity, truncated mint, so same-symbol tokens are distinguishable.
3. **Add** — from the result row; row flips to added state; duplicates blocked.
4. **Remove** — one click, no confirmation.
5. **Sort** — client-side on price change, market cap, liquidity, volume, holders.
6. **Timeframe** — 5m / 1h / 6h / 24h across all change columns. No refetch; all four windows arrive in the same response.
7. **Refresh** — manual button plus "last updated" timestamp.

## Settled decisions

- SOL (`So11111111111111111111111111111111111111112`) seeded on first visit only, tracked by a separate `seeded` flag. Removed SOL stays removed. Empty watchlist is valid and renders the empty view.
- Storage holds mint addresses and the `seeded` flag only. Market data always fetched fresh.
- One anonymous user, one watchlist, one device. No accounts, no sync, no server-side persistence.
- Snapshot at load, not a live feed. No polling.
- Spinner while loading. Sort and timeframe are session state, not persisted.
- Soft cap ~50 tokens, under the 100-mint batch limit.
- Solana only.
- Desktop table, mobile cards. Same data and flows; both primary.

Out of scope: trading, wallet connection, charts, alerts, multiple watchlists, export.

## How to work here

This is a small app. Keep it small.

- Build exactly what was asked. No extra flags, config, routes, or "while I was in there" features.
- Server Components by default; `"use client"` only where interactivity actually needs it.
- No `useMemo` / `useCallback` without a stated reason.
- No new abstraction until the same code exists in three places. No `utils/`, `hooks/`, or generic wrappers for one caller.
- No tests unless asked. No mocks, fixtures, or scaffolding.
- Comments for non-obvious logic and short function-level summaries — nullable API fields, Jupiter quirks, an invariant that isn't visible from the code. Don't annotate individual lines with what they already say.
- No new dependencies without saying why one is needed.
- Follow the patterns already in the file you're editing rather than importing a better one.
- Multi-file change: list the files and a one-line purpose each, then write the code. Skip preambles and alternative architectures.
- Ambiguous? Pick the simplest option that fits existing patterns and state the assumption in one sentence. Ask only when the readings lead to materially different work.

## Verification

Any UI change gets verified in a real browser before you call it done — Playwright MCP or the Chrome extension against `next dev`. Exercise the flow you touched, check the console for errors, and say what you saw. "It compiles" is not verification.
