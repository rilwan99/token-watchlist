const DASH = "—";

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

/** Full precision price. Sub-cent tokens need more decimals than $102.56 does. */
export function formatPrice(value: number | null): string {
  if (!isNumber(value)) return DASH;
  const maximumFractionDigits = value < 0.01 ? 8 : value < 1 ? 6 : 2;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits })}`;
}

/**
 * Market cap, liquidity, volume: "$73.2B", "$402K", "$233". Three significant figures
 * rather than two decimals, so every cell caps at five characters and the right-aligned
 * column edge holds instead of shifting between "$464.1M" and "$412.07M".
 */
export function formatCompactUsd(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return `$${value.toLocaleString("en-US", { notation: "compact", maximumSignificantDigits: 3 })}`;
}

/** Jupiter already returns percent units, so no x100. */
export function formatPercent(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** "So11...1112" - enough to tell same-symbol tokens apart. */
export function formatMint(mint: string): string {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

export function formatCount(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}
