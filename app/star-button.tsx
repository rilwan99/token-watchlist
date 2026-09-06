"use client";

// Filled means "on the watchlist". It is the only membership signal a row carries, so it is
// also the only control - one target that both states the fact and changes it, rather than a
// badge that reports and a button that acts, which can disagree.
const STAR = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

/**
 * 44px on touch, 32px from 480px up, matching the trailing grid column in both row layouts.
 * The label names the action rather than the state, because pressing it is what a screen
 * reader user is deciding about; `aria-pressed` would say the same thing twice.
 *
 * Visibility is the caller's: a search row hides an unfilled star until hover or focus, a
 * watchlist row never hides one. It is hidden with opacity, never `display`, so it keeps its
 * tab stop - tabbing to it is how a keyboard reveals it.
 */
export default function StarButton({
  filled,
  symbol,
  onClick,
  className = "",
}: {
  filled: boolean;
  symbol: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        filled
          ? `Remove ${symbol} from watchlist`
          : `Add ${symbol} to watchlist`
      }
      className={`flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none min-[480px]:size-8 ${
        filled ? "text-accent" : "text-muted hover:text-ink focus-visible:text-ink"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className={`size-[18px] ${filled ? "fill-current stroke-current" : "fill-none stroke-current"}`}
      >
        <path d={STAR} />
      </svg>
    </button>
  );
}
