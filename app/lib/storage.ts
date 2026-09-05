export const SOL_MINT = "So11111111111111111111111111111111111111112";

const MINTS_KEY = "watchlist:mints";
const SEEDED_KEY = "watchlist:seeded";

export function saveMints(mints: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MINTS_KEY, JSON.stringify(mints));
  } catch (error) {
    // Quota exceeded or private mode: the session still works, it just won't survive reload.
    console.warn("[storage] could not persist watchlist", error);
  }
}

export function loadMints(): string[] {
  if (typeof window === "undefined") return [];
  try {
    // Seed SOL on the first visit only. A removed SOL stays removed.
    if (window.localStorage.getItem(SEEDED_KEY) !== "true") {
      window.localStorage.setItem(SEEDED_KEY, "true");
      saveMints([SOL_MINT]);
      return [SOL_MINT];
    }
    const raw = window.localStorage.getItem(MINTS_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((mint): mint is string => typeof mint === "string");
  } catch (error) {
    console.warn("[storage] could not read watchlist, starting empty", error);
    return [];
  }
}
