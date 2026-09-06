// Fails the build if a Client Component imports this module.
import "server-only";
import { isMintAddress } from "@/app/lib/format";
import type { OrganicScoreLabel, Token, TokenStats } from "@/app/lib/types";

const ENDPOINT = "https://api.jup.ag/tokens/v2/search";

// Jupiter defaults a name search to 20, and it matches names as well as symbols. `sol`
// spends 14 of those 20 on tokenised equities matching "Solutions", "Solar" and "Solstice",
// which pushes JitoSOL, mSOL and PSOL to ranks 18-20 and drops bSOL, dSOL, hSOL and BNSOL
// off the response entirely. Only the free-form path sends this: a mint batch is already
// bounded by the route's 100-mint cap and returns every mint asked for without it.
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
  return value === "high" || value === "medium" || value === "low" ? value : null;
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
 * Those results are returned untouched: filtering the batch path would drop a watched token
 * out of the table while its mint stayed in storage, so it could never come back.
 */
function isMintQuery(query: string): boolean {
  return query.split(",").every((part) => isMintAddress(part.trim()));
}

/**
 * A token with null liquidity has no market at all, and a name search surfaces plenty of
 * them: none of the 14 that `sol` returns has a 24h change, nine have no price, and they
 * hold 2-12 addresses each. Every column this app renders is blank for them, so they are
 * not weaker results but empty ones.
 *
 * This is not a judgment about what a token is - liquid tokenised equities pass it and rank
 * first for their own symbols (`NVDAx`, $1.86M liquidity, 71K holders). Nor does it override
 * Jupiter's ranking, which places these rows at 4-17 and so is not handling them at all.
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
