import type { Token } from "@/app/lib/types";

type TokensResponse = { tokens: Token[] } | { error: string };

/**
 * Free-form search by symbol, name, or mint. Jupiter returns ~20 results.
 * Commas are stripped: the route reads a comma-separated value as a mint batch.
 */
export async function searchTokens(query: string, signal?: AbortSignal): Promise<Token[]> {
  const cleaned = query.replaceAll(",", " ").trim();
  if (cleaned === "") return [];
  return requestTokens(cleaned, signal);
}

async function requestTokens(query: string, signal?: AbortSignal): Promise<Token[]> {
  let res: Response;
  try {
    res = await fetch(`/api/tokens?query=${encodeURIComponent(query)}`, { signal });
  } catch (caught) {
    // An abort is the caller superseding its own request, not a failure worth reporting.
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
    // fetch only rejects on transport failure, and its message ("Failed to fetch") is not user-facing.
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

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
