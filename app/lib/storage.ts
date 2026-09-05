export const SOL_MINT = "So11111111111111111111111111111111111111112";

const MINTS_KEY = "watchlist:mints";
const SEEDED_KEY = "watchlist:seeded";
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function saveMints(mints: string[]): void {
  try {
    window.localStorage.setItem(MINTS_KEY, JSON.stringify(mints));
  } catch (error) {
    // Quota exceeded or private mode: the session still works, it just won't survive reload.
    console.warn("[storage] could not persist watchlist", error);
  }
}

export function loadMints(): string[] {
  try {
    // Seed SOL on the first visit only. A removed SOL stays removed.
    if (window.localStorage.getItem(SEEDED_KEY) !== "true") {
      saveMints([SOL_MINT]);
      window.localStorage.setItem(SEEDED_KEY, "true");
      return [SOL_MINT];
    }
  } catch (error) {
    // Storage is blocked, so the flag can never be read back.
    console.warn("[storage] could not read or write the seed flag", error);
    return [SOL_MINT];
  }

  try {
    const raw = window.localStorage.getItem(MINTS_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (mint): mint is string =>
        typeof mint === "string" && BASE58_MINT.test(mint),
    );
  } catch (error) {
    console.warn("[storage] could not read watchlist, starting empty", error);
    return [];
  }
}
