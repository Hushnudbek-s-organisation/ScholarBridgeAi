import { parsePagination } from "@/lib/pagination";
import { NextResponse } from "next/server";
import { guardAdmin, serverError } from "@/lib/growth/api";
import { recentChannelAudit } from "@/lib/channel/repo";

export const dynamic = "force-dynamic";

/** Admin → Kanal → Jurnal: the append-only trail of every channel mutation. */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  const page = parsePagination(new URL(req.url).searchParams);
  if (!page.ok) return NextResponse.json({ error: page.error }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, rows: await recentChannelAudit(page.limit) });
  } catch (error) {
    return serverError("channel audit", error);
  }
}
