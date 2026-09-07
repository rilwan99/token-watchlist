/**
 * What localStorage holds: enough to paint a row on reload, and nothing that goes stale.
 */
export type WatchEntry = {
  mint: string;
  symbol: string;
  name: string;
  icon: string | null;
};

export type TokenStats = {
  priceChange: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
};

/** Jupiter's own bucketing of `organicScore`, so the bar needs no thresholds of ours. */
export type OrganicScoreLabel = "high" | "medium" | "low";

export type Token = {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  isVerified: boolean;
  /** Launch origin ("pump.fun", "letsbonk.fun"); null for a directly created mint. */
  launchpad: string | null;
  organicScore: number | null;
  organicScoreLabel: OrganicScoreLabel | null;
  usdPrice: number | null;
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  /**
   * Jupiter also returns 5m/1h/6h buckets in the same response. Only the 24h window is
   * rendered, so only it is normalized - the app has no timeframe switch.
   */
  stats24h: TokenStats;
};
