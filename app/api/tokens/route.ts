import { searchTokens } from "@/app/lib/tokens";

const MAX_MINTS = 100;
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(request: Request) {
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
    const invalid = parts.find((mint) => !BASE58_MINT.test(mint));
    if (invalid) {
      return Response.json(
        { error: `Not a valid mint address: ${invalid}` },
        { status: 400 },
      );
    }
  }

  try {
    const tokens = await searchTokens(query);
    return Response.json({ tokens });
  } catch (error) {
    console.error("[/api/tokens]", error);
    return Response.json(
      { error: "Failed to reach the token data provider." },
      { status: 502 },
    );
  }
}
