// Fails the build if a Client Component imports this module.
import "server-only";

const WINDOW_MS = 60_000;
// A human typing flat out settles roughly one search per debounce plus the odd refresh, so
// this is well clear of real use and still caps a script.
const MAX_REQUESTS = 60;

// In-memory and per-instance: a serverless deployment runs several of these and recycles them,
// so this bounds one instance's share rather than the true total. It is a speed bump on a
// public endpoint that fronts a keyed upstream, not an access control - a real limit needs
// shared storage (Redis, or the host's own rate limiting).
const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * The first hop of `x-forwarded-for` is the client as the platform saw it. It is advisory -
 * a caller can send the header itself - so this buckets traffic, it does not identify it.
 */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/**
 * One fixed window per client. `retryAfter` is whole seconds until the window resets, for the
 * `Retry-After` header.
 */
export function checkRateLimit(request: Request): { rateLimited: boolean; retryAfter: number } {
  const now = Date.now();

  // Swept here because nothing else ever visits the map: without this it grows for the life of
  // the instance. The cost is one pass over the clients seen in the last minute.
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }

  const key = clientKey(request);
  const entry = hits.get(key);
  if (entry === undefined) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { rateLimited: false, retryAfter: 0 };
  }

  entry.count += 1;
  return {
    rateLimited: entry.count > MAX_REQUESTS,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}
