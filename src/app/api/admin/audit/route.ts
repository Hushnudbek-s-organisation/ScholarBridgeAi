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
    const logs = await getAuditLogs({
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") ? Number(searchParams.get("entityId")) : undefined,
      actor: searchParams.get("actor") || undefined,
      limit: Number(searchParams.get("limit") || 100),
      offset: Number(searchParams.get("offset") || 0),
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
