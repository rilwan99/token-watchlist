// Fails the build if a Client Component imports this module.
import "server-only";

export type Timeframe = "5m" | "1h" | "6h" | "24h";

export type TokenStats = {
  priceChange: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
};

export type Token = {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  isVerified: boolean;
  organicScore: number | null;
  usdPrice: number | null;
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  stats: Record<Timeframe, TokenStats>;
};

const ENDPOINT = "https://api.jup.ag/tokens/v2/search";

type RawStats = Partial<TokenStats> | null | undefined;

function normalizeStats(raw: RawStats): TokenStats {
  return {
    priceChange: raw?.priceChange ?? null,
    buyVolume: raw?.buyVolume ?? null,
    sellVolume: raw?.sellVolume ?? null,
  };
}

export async function searchTokens(query: string): Promise<Token[]> {
  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "JUPITER_API_KEY is not set. Add it to .env and restart next dev.",
    );
  }

  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Jupiter search failed: ${res.status} ${res.statusText}`);
  }

  const raw: unknown = await res.json();
  if (!Array.isArray(raw)) {
    throw new Error(
      "Jupiter returned an unexpected payload shape (expected an array).",
    );
  }

  return raw.map(
    (t): Token => ({
      id: t.id,
      name: t.name ?? t.symbol ?? t.id,
      symbol: t.symbol ?? "",
      icon: t.icon ?? null,
      isVerified: t.isVerified === true,
      organicScore: t.organicScore ?? null,
      usdPrice: t.usdPrice ?? null,
      mcap: t.mcap ?? null,
      liquidity: t.liquidity ?? null,
      holderCount: t.holderCount ?? null,
      stats: {
        "5m": normalizeStats(t.stats5m),
        "1h": normalizeStats(t.stats1h),
        "6h": normalizeStats(t.stats6h),
        "24h": normalizeStats(t.stats24h),
      },
    }),
  );
}
