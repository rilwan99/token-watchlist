"use client";

import { useState } from "react";

type TokenIconProps = {
  src: string | null;
  symbol: string;
  className: string;
  /**
   * Size classes for the fallback initials, at roughly 40% of the circle. The three call sites
   * draw the circle at 22px, 28px and 32px, and a single hardcoded size left the initials
   * cramped in the largest and crowding the edge of the smallest.
   */
  labelClassName?: string;
  dimmed?: boolean;
};

export default function TokenIcon({
  src,
  symbol,
  className,
  labelClassName = "text-[10px]",
  dimmed = false,
}: TokenIconProps) {
  // The failed URL rather than a boolean: rows are keyed by mint, so the instance outlives a
  // refresh, and a boolean would keep serving the fallback after Jupiter returns a working icon.
  const [failed, setFailed] = useState<string | null>(null);

  if (src === null || failed === src) {
    return (
      <span
        aria-hidden="true"
        className={`${className} ${labelClassName} flex shrink-0 items-center justify-center rounded-full bg-raised font-medium text-muted`}
      >
        {/* Storage permits an empty symbol, which would otherwise paint a blank circle. */}
        {symbol.slice(0, 2).toUpperCase() || "—"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Jupiter icon hosts are dynamic.
    <img
      src={src}
      alt=""
      onError={() => setFailed(src)}
      className={`${className} shrink-0 rounded-full ${dimmed ? "opacity-40" : ""}`}
    />
  );
}
