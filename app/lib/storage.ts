import { isMintAddress } from "@/app/lib/format";
import type { Token, WatchEntry } from "@/app/lib/types";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const ENTRIES_KEY = "watchlist:tokens";
const SEEDED_KEY = "watchlist:seeded";

// Identity only. The icon URL is left null so the first fetch fills it in rather than this
// file carrying a CDN path that can rot.
const SOL_ENTRY: WatchEntry = {
  mint: SOL_MINT,
  symbol: "SOL",
  name: "Solana",
  icon: null,
};

/** Narrows one stored element, or null if it can't identify a token. */
function toEntry(value: unknown): WatchEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  // Without a valid mint the row can neither be fetched nor keyed, so it is not a row.
  if (typeof raw.mint !== "string" || !isMintAddress(raw.mint)) return null;
  return {
    mint: raw.mint,
    symbol: typeof raw.symbol === "string" ? raw.symbol : "",
    name: typeof raw.name === "string" ? raw.name : "",
    icon: typeof raw.icon === "string" && raw.icon !== "" ? raw.icon : null,
  };
}

/** Strips the live market data off a search result, leaving what is safe to persist. */
export function toWatchEntry(token: Token): WatchEntry {
  return {
    mint: token.id,
    symbol: token.symbol,
    name: token.name,
    icon: token.icon,
  };
}

export function saveEntries(entries: WatchEntry[]): void {
  try {
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    // Quota exceeded or private mode: the session still works, it just won't survive reload.
    console.warn("[storage] could not persist watchlist", error);
  }
}

/**
 * Reads the saved watchlist, in saved order. Anything unreadable - absent, not JSON, not an
 * array, an array of something else, a second tab mid-write - falls back to an empty list
 * rather than throwing, because there is no repair worth attempting on a list of favourites.
 */
export function loadEntries(): WatchEntry[] {
  try {
    // Seed SOL on the first visit only. A removed SOL stays removed.
    if (window.localStorage.getItem(SEEDED_KEY) !== "true") {
      saveEntries([SOL_ENTRY]);
      window.localStorage.setItem(SEEDED_KEY, "true");
      return [SOL_ENTRY];
    }
  } catch (error) {
    // Storage is blocked, so the flag can never be read back.
    console.warn("[storage] could not read or write the seed flag", error);
    return [SOL_ENTRY];
  }

  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Deduplicated on the way in as well as on the way out: two tabs writing at once is
    // last-write-wins, and a truncated write should not produce two rows for one mint.
    const seen = new Set<string>();
    const entries: WatchEntry[] = [];
    for (const value of parsed) {
      const entry = toEntry(value);
      if (entry === null || seen.has(entry.mint)) continue;
      seen.add(entry.mint);
      entries.push(entry);
    }
    return entries;
  } catch (error) {
    console.warn("[storage] could not read watchlist, starting empty", error);
    return [];
  }
}
