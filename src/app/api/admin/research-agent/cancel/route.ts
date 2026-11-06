import { readJsonBody } from "@/lib/request";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cancelRun, getRunAsync } from "@/lib/research-agent/registry";
import {
  isDurableStoreEnabled,
  patchDurableRun,
  requestDurableCancellation,
} from "@/lib/research-agent/durableStore";

/** POST: request cancellation of an active Research Agent run (admin only). */
export async function POST(req: Request) {
  try {
    const boundedJson = await readJsonBody<Record<string, any>>(req);
    if (!boundedJson.ok) return Response.json({ error: boundedJson.error, code: boundedJson.code }, { status: boundedJson.status });
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const runId = typeof boundedJson.body.runId === "string" ? boundedJson.body.runId.trim() : "";
    if (!runId || runId.length > 200) return NextResponse.json({ error: "runId is required" }, { status: 400 });

    const run = await getRunAsync(runId);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const local = cancelRun(runId);
    let durable = false;
    if (isDurableStoreEnabled()) {
      durable = await requestDurableCancellation(runId);
      // A restarted process has no local Map entry; make cancellation visible
      // in the durable status even when no worker is currently attached.
      if (!local) {
        const fenced = await patchDurableRun(runId, {
          state: "cancelled",
          cancelRequested: true,
          error: "Cancelled by admin.",
          finishedAt: Date.now(),
        }, { kind: "admin_cancel" });
        durable = durable || fenced;
      }
    }
    return NextResponse.json({ ok: true, runId, cancelled: local || durable });
  } catch (error) {
    console.error("POST /api/admin/research-agent/cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel run" }, { status: 500 });
  }
}
