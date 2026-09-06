export default function WarningTriangle() {
  return (
    <span className="inline-flex shrink-0 text-warn" title="Thin liquidity — this token may be hard to exit">
      <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className="size-3.5">
        <path d="M8.87 1.5 15 13.2a1 1 0 0 1-.88 1.47H1.88A1 1 0 0 1 1 13.2L7.13 1.5a1 1 0 0 1 1.74 0ZM8 5.2a.7.7 0 0 0-.7.7v3.5a.7.7 0 1 0 1.4 0V5.9A.7.7 0 0 0 8 5.2Zm0 6.45a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Z" />
      </svg>
      <span className="sr-only">Thin liquidity — this token may be hard to exit</span>
    </span>
  );
}
