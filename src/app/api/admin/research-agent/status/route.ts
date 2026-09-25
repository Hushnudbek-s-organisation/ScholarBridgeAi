import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRun, listRuns } from "@/lib/research-agent/registry";

/** GET: poll a run's progress, or list recent runs. */
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
    const runId = searchParams.get("runId");
    if (runId) {
      const run = getRun(runId);
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      return NextResponse.json({ run });
    }
    return NextResponse.json({ runs: listRuns() });
  } catch (error) {
    console.error("GET /api/admin/research-agent/status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
