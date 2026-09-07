// Fails the build if a Client Component imports this module.
import "server-only";
import { isMintAddress } from "@/app/lib/format";
import type { OrganicScoreLabel, Token, TokenStats } from "@/app/lib/types";

const ENDPOINT = "https://api.jup.ag/tokens/v2/search";

const SEARCH_LIMIT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asOrganicScoreLabel(value: unknown): OrganicScoreLabel | null {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : null;
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
    // Jupiter sends null, not false, for an unverified token.
    isVerified: value.isVerified === true,
    launchpad: asString(value.launchpad),
    organicScore: asNumber(value.organicScore),
    organicScoreLabel: asOrganicScoreLabel(value.organicScoreLabel),
    usdPrice: asNumber(value.usdPrice),
    mcap: asNumber(value.mcap),
    liquidity: asNumber(value.liquidity),
    holderCount: asNumber(value.holderCount),
    stats24h: toStats(value.stats24h),
  };
}

/**
 * True when every comma-separated part is a mint address, which means the caller already
 * knows the token it wants - a pasted mint, or `fetchWatchlist` rehydrating stored mints.
 */
function isMintQuery(query: string): boolean {
  return query.split(",").every((part) => isMintAddress(part.trim()));
}

/**
 * A token with null liquidity has no market at all.
 */
function hasMarket(token: Token): boolean {
  return token.liquidity !== null;
}

/** Calls Jupiter directly. Server-only; the browser goes through `/api/tokens` instead. */
export async function searchUpstream(query: string): Promise<Token[]> {
  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "JUPITER_API_KEY is not set. Add it to .env and restart next dev.",
    );
  }

  const mintQuery = isMintQuery(query);
  const url = mintQuery
    ? `${ENDPOINT}?query=${encodeURIComponent(query)}`
    : `${ENDPOINT}?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`;
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

  const tokens = raw
    .map(toToken)
    .filter((token): token is Token => token !== null);

  return mintQuery ? tokens : tokens.filter(hasMarket);
}
