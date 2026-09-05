import type { Token } from "@/app/lib/types";

type TokensResponse = { tokens: Token[] } | { error: string };

async function requestTokens(query: string): Promise<Token[]> {
  const res = await fetch(`/api/tokens?query=${encodeURIComponent(query)}`);
  const body: TokensResponse = await res.json();
  if ("error" in body) throw new Error(body.error);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}.`);
  return body.tokens;
}

/** One batch request for the whole watchlist, returned in stored order. */
export async function fetchWatchlist(mints: string[]): Promise<Token[]> {
  if (mints.length === 0) return [];
  const tokens = await requestTokens(mints.join(","));
  const byMint = new Map(tokens.map((token) => [token.id, token]));
  return mints
    .map((mint) => byMint.get(mint))
    .filter((token): token is Token => token !== undefined);
}
