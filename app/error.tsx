"use client";

/**
 * Route-level boundary for the page segment. Without it a render-time throw anywhere in the
 * watchlist leaves a blank document with no way back short of a reload.
 *
 * It carries `page.tsx`'s own wrapper because it replaces that file's output, not its contents,
 * so the column keeps its width and padding while the error shows.
 *
 * `retry` re-renders the segment rather than clearing the boundary: the watchlist rebuilds from
 * localStorage and refetches, so a transient failure resolves without touching the saved list.
 * The message is deliberately not rendered - in production a server error's message is replaced
 * by a generic one, and a client error's can be anything. The digest is what matches a log line.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col bg-ground px-6 py-10 min-[480px]:py-16">
      <div className="flex flex-col items-center justify-center rounded-xl border border-edge bg-surface px-6 py-10 text-center">
        <p className="text-base font-medium text-ink">Something went wrong</p>
        <p className="mt-1.5 text-sm text-muted">
          The watchlist couldn&apos;t be displayed. Your saved tokens are still stored.
        </p>
        {error.digest === undefined ? null : (
          <p className="mt-2 font-mono text-xs text-faint">Reference {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
