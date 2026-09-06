import type { Token, WatchEntry } from "@/app/lib/types";

export type SortKey = "price" | "change" | "mcap" | "liquidity" | "holders";

export type SortState = { key: SortKey; direction: "asc" | "desc" };

/**
 * The mobile control's menu. The desktop headers carry their own shorter labels - "24h" fits
 * an 84px column, "24h change" does not - so the two lists are deliberately not shared.
 */
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "change", label: "24h change" },
  { key: "mcap", label: "Market cap" },
  { key: "liquidity", label: "Liquidity" },
  { key: "holders", label: "Holders" },
];

/** Live metrics only: a row the fetch has not filled in yet has no value to sort on. */
function metric(key: SortKey, token: Token | undefined): number | null {
  if (token === undefined) return null;
  const value = {
    price: token.usdPrice,
    change: token.stats24h.priceChange,
    mcap: token.mcap,
    liquidity: token.liquidity,
    holders: token.holderCount,
  }[key];
  return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * A view over the saved order, never a rewrite of it - storage keeps the user's order and a
 * null sort returns to it. Rows with no live value sort last in both directions, so a token
 * Jupiter no longer returns cannot win "cheapest", and ties keep the saved order, which a
 * stable sort gives for free.
 */
export function sortEntries(
  entries: WatchEntry[],
  metrics: Map<string, Token>,
  sort: SortState | null,
): WatchEntry[] {
  if (sort === null) return entries;

  const factor = sort.direction === "asc" ? 1 : -1;
  return entries.slice().sort((a, b) => {
    const left = metric(sort.key, metrics.get(a.mint));
    const right = metric(sort.key, metrics.get(b.mint));
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * factor;
  });
}
