import { isMintAddress } from "@/app/lib/format";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { searchUpstream } from "@/app/lib/tokens";

const MAX_MINTS = 100;
// Only the free-form path needs this: a batch is already bounded by MAX_MINTS times the 44
// characters `isMintAddress` allows. A symbol or name longer than this is not a real search,
// and this route is a public front for a keyed upstream.
const MAX_QUERY_LENGTH = 64;

export async function GET(request: Request) {
  const { rateLimited, retryAfter } = checkRateLimit(request);
  if (rateLimited) {
    return Response.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  const query = new URL(request.url).searchParams.get("query")?.trim();

  if (!query) {
    return Response.json(
      { error: "Missing `query` parameter." },
      { status: 400 },
    );
  }

  // A single value is a symbol/name search, which is free-form. Only a
  // comma-separated list is a batch of mints, and those are checked.
  const parts = query.split(",");
  if (parts.length > 1) {
    if (parts.length > MAX_MINTS) {
      return Response.json(
        { error: `Too many mints: ${parts.length}. Maximum is ${MAX_MINTS}.` },
        { status: 400 },
      );
    }
    const invalid = parts.find((mint) => !isMintAddress(mint));
    if (invalid) {
      return Response.json(
        { error: `Not a valid mint address: ${invalid}` },
        { status: 400 },
      );
    }
  } else if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      { error: `Query is too long. Maximum is ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const tokens = await searchUpstream(query);
    return Response.json({ tokens });
  } catch (error) {
    console.error("[/api/tokens]", error);
    return Response.json(
      { error: "Failed to reach the token data provider." },
      { status: 502 },
    );
  }
}
