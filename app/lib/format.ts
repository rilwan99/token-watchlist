import type { TokenStats } from "@/app/lib/types";

const DASH = "—";

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

const PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT_USD_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumSignificantDigits: 3,
});
const COMPACT_COUNT_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

function toSubscript(count: number): string {
  return String(count)
    .split("")
    .map((digit) => SUBSCRIPT_DIGITS[Number(digit)])
    .join("");
}

/**
 * Price for the mobile row, where the column has no room to grow: 2dp at a dollar and up,
 * 4dp down to a cent, and subscript-zero notation below it - $0.00005545 renders $0.0₄5545,
 */
export function formatPriceCompact(value: number | null): string {
  if (!isNumber(value)) return DASH;
  if (value >= 1) return `$${PRICE_FORMAT.format(value)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value <= 0) return "$0.00";

  const [mantissa = "", exponent = "0"] = value.toExponential(3).split("e");
  return `$0.0${toSubscript(-Number(exponent) - 1)}${mantissa.replace(".", "")}`;
}

/**
 * Market cap, liquidity, volume: "$73.2B", "$402K", "$233" - Three significant figures.
 */
export function formatCompactUsd(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return `$${COMPACT_USD_FORMAT.format(value)}`;
}

export function formatPercent(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function displayChange(value: number | null): number | null {
  if (!isNumber(value)) return null;
  const rounded = Number(value.toFixed(2));
  return rounded === 0 ? 0 : rounded;
}

export function formatChange(value: number | null): string {
  const shown = displayChange(value);
  if (shown === null) return DASH;
  if (shown === 0) return "0.00%";
  return `${shown > 0 ? "+" : "−"}${Math.abs(shown).toFixed(2)}%`;
}

/** Direction behind `formatChange`, so the colour and the text agree about zero. */
export function changeTone(value: number | null): "up" | "down" | "flat" {
  const shown = displayChange(value);
  if (shown === null || shown === 0) return "flat";
  return shown > 0 ? "up" : "down";
}

/** "So11...1112" - enough to tell same-symbol tokens apart. */
export function formatMint(mint: string): string {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

// Base58 omits 0, O, I and l. Solana mints are 32-44 characters.
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isMintAddress(value: string): boolean {
  return BASE58_MINT.test(value);
}

// Below this, liquidity carries an amber warning
const LOW_LIQUIDITY_USD = 10_000;

/** Shared by the search row and the watchlist row, so one threshold governs both. */
export function isThinLiquidity(liquidity: number | null): boolean {
  return isNumber(liquidity) && liquidity < LOW_LIQUIDITY_USD;
}

/**
 * Jupiter has no total volume field, and either side can be null on its own. Two nulls mean
 * no data, so the cell reads as a dash rather than $0.
 */
export function volume24h(stats: TokenStats): number | null {
  if (stats.buyVolume === null && stats.sellVolume === null) return null;
  return (stats.buyVolume ?? 0) + (stats.sellVolume ?? 0);
}

export function formatCount(value: number | null): string {
  if (!isNumber(value)) return DASH;
  return COMPACT_COUNT_FORMAT.format(value);
}
