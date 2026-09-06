// Fails the build if a Client Component imports this module.
import "server-only";
import type { Token, TokenStats } from "@/app/lib/types";

const ENDPOINT = "https://api.jup.ag/tokens/v2/search";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function toStats(value: unknown): TokenStats {
  const raw = isRecord(value) ? value : {};
  return {
    priceChange: asNumber(raw.priceChange),
    buyVolume: asNumber(raw.buyVolume),
    sellVolume: asNumber(raw.sellVolume),
  };
}

function toToken(value: unknown): Token | null {
  if (!isRecord(value)) return null;
  // Without a mint the row cannot be matched back to the watchlist, so drop it.
  const id = asString(value.id);
  if (id === null) return null;

  const symbol = asString(value.symbol);
  return {
    id,
    name: asString(value.name) ?? symbol ?? id,
    symbol: symbol ?? "",
    icon: asString(value.icon),
    isVerified: value.isVerified === true,
    organicScore: asNumber(value.organicScore),
    usdPrice: asNumber(value.usdPrice),
    mcap: asNumber(value.mcap),
    liquidity: asNumber(value.liquidity),
    holderCount: asNumber(value.holderCount),
    stats: {
      "5m": toStats(value.stats5m),
      "1h": toStats(value.stats1h),
      "6h": toStats(value.stats6h),
      "24h": toStats(value.stats24h),
    },
  };
}

/** Calls Jupiter directly. Server-only; the browser goes through `/api/tokens` instead. */
export async function searchUpstream(query: string): Promise<Token[]> {
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

  return raw
    .map(toToken)
    .filter((token): token is Token => token !== null);
}
