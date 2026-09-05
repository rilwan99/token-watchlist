# Token Watchlist

A Solana token-watchlist prototype built with React 19, TypeScript, Next.js 16 App Router, and Tailwind CSS v4.

The app is designed to search Jupiter token data and display market snapshots. The current UI is a static table prototype; watchlist persistence, search controls, sorting, timeframe selection, and refresh actions are not wired into the page yet.

## Requirements

- Node.js 20 or later
- A Jupiter API key

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```env
   JUPITER_API_KEY=your_jupiter_api_key
   ```

   Keep this variable server-side. Do not rename it to `NEXT_PUBLIC_JUPITER_API_KEY` or expose it in client code.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Token API

The route handler at `GET /api/tokens` forwards searches to the Jupiter Tokens API V2 and keeps the API key on the server.

```text
GET /api/tokens?query=sol
GET /api/tokens?query=So11111111111111111111111111111111111111112
GET /api/tokens?query=mint1,mint2
```

The `query` parameter accepts a token symbol, name, mint address, or a comma-separated list of mint addresses. Batch requests are limited to 100 mints.

The response has the following shape:

```json
{
  "tokens": [
    {
      "id": "<mint address>",
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
        "5m": { "priceChange": 0.2, "buyVolume": 1000, "sellVolume": 900 },
        "1h": { "priceChange": 1.1, "buyVolume": 8000, "sellVolume": 7000 },
        "6h": { "priceChange": 2.4, "buyVolume": 40000, "sellVolume": 35000 },
        "24h": { "priceChange": 3.6, "buyVolume": 150000, "sellVolume": 120000 }
      }
    }
  ]
}
```

Nullable Jupiter fields are normalized to `null` by the server module. Missing values should be rendered as a dash by the UI rather than as `undefined` or `NaN`.

## Project structure

```text
app/
├── api/tokens/route.ts  # Server-side token search endpoint
├── lib/tokens.ts        # Jupiter client, types, and response normalization
├── page.tsx             # Watchlist page prototype
├── layout.tsx           # Root layout and metadata
└── globals.css          # Tailwind import and global styles
```

## Product scope

The planned watchlist experience supports:

- Searching Solana tokens by symbol, name, or mint address
- Adding and removing tokens with duplicate protection
- Persisting mint addresses locally across reloads
- Seeding SOL on the first visit while allowing it to be removed later
- Sorting by price change, market cap, liquidity, volume, or holders
- Switching between 5m, 1h, 6h, and 24h market windows without refetching
- Manual refresh with a last-updated timestamp
- Desktop table and mobile card layouts

Trading, wallet connections, charts, alerts, exports, accounts, and server-side persistence are outside the project scope.

## Data source

Market data comes from the [Jupiter Tokens API V2](https://dev.jup.ag/docs/tokens/v2). The application is Solana-only and treats the API response as a point-in-time snapshot; it does not poll for live updates.
