import { handleGoRedirect } from "@/lib/channel/go";

export const dynamic = "force-dynamic";

/**
 * Tracked short link used by every channel post: `/go/<code>`.
 * See `src/lib/channel/go.ts` for the rules (DB-only destination, aggregated
 * clicks, crawler/HEAD filtering).
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleGoRedirect(req, code);
}

export async function HEAD(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleGoRedirect(req, code);
}
