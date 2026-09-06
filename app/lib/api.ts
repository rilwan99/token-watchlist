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

/**
 * One batch request for the whole watchlist. The response is returned as it arrives, in
 * whatever order and however short: row order and row membership belong to the stored entry
 * list, and a mint Jupiter no longer answers for keeps its row with dashed-out metrics.
 */
export async function fetchTokens(mints: string[]): Promise<Token[]> {
  if (mints.length === 0) return [];
  return requestTokens(mints.join(","));
}
