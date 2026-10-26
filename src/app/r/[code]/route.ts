import { handleGoRedirect } from "@/lib/channel/go";

export const dynamic = "force-dynamic";

/** Legacy alias of `/go/<code>` — links already shared keep working. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleGoRedirect(req, code);
}

export async function HEAD(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return handleGoRedirect(req, code);
}
