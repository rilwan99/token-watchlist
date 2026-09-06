type TokenStatusProps = {
  isVerified: boolean;
  launchpad: string | null;
  /**
   * Extra classes for the launchpad tag. The watchlist row uses it to drop the tag under 768px,
   * where the fixed numeric columns leave the token column too narrow to spell out a symbol
   * beside it. The check has no equivalent - verification always renders.
   */
  tagClassName?: string;
};

export default function TokenStatus({ isVerified, launchpad, tagClassName = "" }: TokenStatusProps) {
  return (
    <>
      {isVerified ? (
        <span className="shrink-0 text-accent">
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="m3 8 3 3 7-7" />
          </svg>
          <span className="sr-only">Verified</span>
        </span>
      ) : null}
      {!isVerified && launchpad !== null ? (
        <span className={`shrink-0 rounded border border-edge px-1 text-[10px] text-muted ${tagClassName}`}>
          {launchpad}
        </span>
      ) : null}
    </>
  );
}
