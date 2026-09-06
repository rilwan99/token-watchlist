"use client";

const STAR = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

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
