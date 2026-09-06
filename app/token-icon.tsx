"use client";

import { useState } from "react";

/**
 * A token icon that always renders something.
 *
 * Icons are arbitrary remote URLs on hosts this app does not control, so a dead link is
 * routine rather than exceptional - and a stored row can carry a URL that worked months ago.
 * The fallback is the symbol's first letter on a neutral disc rather than a `?`, which the
 * row already spends on "unverified" a few pixels to the right.
 *
 * A component rather than an inline `<img>` because the broken state is per-instance state,
 * which needs its own component boundary to live in.
 */
export default function TokenIcon({
  src,
  symbol,
  className,
  dimmed = false,
}: {
  src: string | null;
  symbol: string;
  /** Sizing, e.g. `size-7`. */
  className: string;
  dimmed?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  if (src === null || broken) {
    return (
      <span
        aria-hidden="true"
        className={`${className} flex shrink-0 items-center justify-center rounded-full bg-edge text-[10px] font-medium text-muted`}
      >
        {symbol.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  // Not `next/image`: icons are arbitrary remote hosts, which would need every one of them
  // in `images.remotePatterns` or a proxy through the optimizer for a 28px avatar.
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className={`${className} shrink-0 rounded-full ${dimmed ? "opacity-40" : ""}`}
    />
  );
}
