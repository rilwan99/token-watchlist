export type Timeframe = "5m" | "1h" | "6h" | "24h";

export type TokenStats = {
  priceChange: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
};

export type Token = {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  isVerified: boolean;
  organicScore: number | null;
  usdPrice: number | null;
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  stats: Record<Timeframe, TokenStats>;
};
