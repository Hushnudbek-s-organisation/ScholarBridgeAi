import { NextResponse } from "next/server";
import { guardAdmin, serverError } from "@/lib/growth/api";
import { recentChannelAudit } from "@/lib/channel/repo";

export const dynamic = "force-dynamic";

/** Admin → Kanal → Jurnal: the append-only trail of every channel mutation. */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 100);
  try {
    return NextResponse.json({ ok: true, rows: await recentChannelAudit(Number.isFinite(limit) ? limit : 100) });
  } catch (error) {
    return serverError("channel audit", error);
  }
}
