"use client";

import { useState } from "react";

export default function TokenIcon({
  src,
  symbol,
  className,
  dimmed = false,
}: {
  src: string | null;
  symbol: string;
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

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Jupiter icon hosts are dynamic.
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className={`${className} shrink-0 rounded-full ${dimmed ? "opacity-40" : ""}`}
    />
  );
}
