import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runBatch } from "@/lib/research-agent/run-batch";
import { createRun, setRun, appendProgress } from "@/lib/research-agent/registry";
import { AGENT_CONFIG } from "@/lib/research-agent/config";
import type { RunRequest } from "@/lib/research-agent/types";

/**
 * Start a research-agent run (admin only). Runs sequentially server-side;
 * progress is polled via /api/admin/research-agent/status.
 */
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

    const ids = Array.isArray(body.universityIds)
      ? body.universityIds.map(Number).filter((n: number) => Number.isFinite(n) && n > 0)
      : body.universityId
        ? [Number(body.universityId)]
        : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "universityId(s) required" }, { status: 400 });
    }

    const request: RunRequest = {
      universityIds: ids.slice(0, 50), // batch cap (spec §17)
      scopes: Array.isArray(body.scopes) && body.scopes.length > 0 ? body.scopes : (AGENT_CONFIG as any).defaultScopes ?? [],
      dryRun: body.dryRun === true,
      maxPages: body.maxPages ? Number(body.maxPages) : undefined,
      // Approval-queue gate (spec §5.4): a writing run may only apply the
      // fields a human approved. Missing/empty means "no gate" for backwards
      // compatibility with the existing dry-run-then-trust workflow.
      approvedFields: Array.isArray(body.approvedFields)
        ? body.approvedFields.filter((k: unknown): k is string => typeof k === "string").slice(0, 500)
        : undefined,
    };

    const runId = createRun(ids[0]);
    setRun(runId, { state: "running" });
    appendProgress(runId, `Queueing ${ids.length} universit${ids.length === 1 ? "y" : "ies"}...`);

    // Run in background — do not block the request.
    void (async () => {
      const { reports, errors } = await runBatch(
        request,
        (universityId, message) => {
          setRun(runId, { universityId });
          appendProgress(runId, message);
        }
      );
      const last = reports[reports.length - 1] ?? null;
      setRun(runId, {
        state: errors.length > 0 && reports.length === 0 ? "error" : "complete",
        report: last,
        error: errors.length > 0 ? errors.join("; ") : undefined,
        finishedAt: Date.now(),
      });
      appendProgress(runId, errors.length > 0 ? `Finished with errors: ${errors.join("; ")}` : "Finished.");
    })();

    return NextResponse.json({ runId, queued: ids.length });
  } catch (error) {
    console.error("POST /api/admin/research-agent/run error:", error);
    return NextResponse.json({ error: "Failed to start research run" }, { status: 500 });
  }
}
