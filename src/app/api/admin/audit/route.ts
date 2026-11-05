import { parsePagination, postgresId } from "@/lib/pagination";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

/** GET: audit/change history (spec §10, §11). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const page = parsePagination(searchParams);
    const rawEntityId = searchParams.get("entityId");
    const entityId = rawEntityId === null ? undefined : rawEntityId === "0" ? 0 : postgresId(rawEntityId);
    if (!page.ok || entityId === null) return NextResponse.json({ error: !page.ok ? page.error : "Invalid entityId" }, { status: 400 });
    const logs = await getAuditLogs({
      entityType: searchParams.get("entityType") || undefined,
      entityId,
      actor: searchParams.get("actor") || undefined,
      limit: page.limit,
      offset: page.offset,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
