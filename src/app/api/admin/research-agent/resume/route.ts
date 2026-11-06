import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resumeResearchRuns } from "@/lib/research-agent/worker";

/**
 * POST: claim and resume stale durable Research Agent runs after a restart.
 *
 * Admin-only. It starts detached workers and returns a summary immediately;
 * it does not expose an official-source adapter and does not accept research
 * parameters. With RESEARCH_DURABLE_STORE unset, it reports enabled:false and
 * leaves the existing process-local behavior untouched.
 */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    const summary = await resumeResearchRuns({ limit: 1 });
    return NextResponse.json(
      { ok: true, ...summary },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/research-agent/resume error:", error);
    return NextResponse.json(
      { error: "Failed to resume research runs" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
