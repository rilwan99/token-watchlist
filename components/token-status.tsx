type TokenStatusProps = {
  isVerified: boolean;
  launchpad: string | null;
};

export default function TokenStatus({ isVerified, launchpad }: TokenStatusProps) {
  return (
    <>
      <span className={`w-3 shrink-0 text-center ${isVerified ? "text-up" : "text-muted"}`}>
        {isVerified ? "✓" : "?"}
        <span className="sr-only">{isVerified ? "Verified" : "Unverified"}</span>
      </span>
      {!isVerified && launchpad !== null ? (
        <span className="shrink-0 rounded border border-edge px-1 text-[10px] text-muted">
          {launchpad}
        </span>
      ) : null}
    </>
  );
}
