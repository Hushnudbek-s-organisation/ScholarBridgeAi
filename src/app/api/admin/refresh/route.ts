import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runRefresh, listRefreshJobs } from "@/lib/refresh";

/** POST: trigger a manual refresh (admin). GET: list refresh jobs. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const scope = body.scope === "universities" ? "universities" : body.scope === "scholarships" ? "scholarships" : "all";
    const result = await runRefresh(scope);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/admin/refresh error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

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
    const jobs = await listRefreshJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET /api/admin/refresh error:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}
