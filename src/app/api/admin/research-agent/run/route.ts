import { readJsonBody } from "@/lib/request";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runBatch } from "@/lib/research-agent/run-batch";
import { AGENT_CONFIG } from "@/lib/research-agent/config";
import {
  createRun,
  setRun,
  appendProgress,
  getRun,
  getIdempotentRunAsync,
  isRunCancelled,
  markRunTimedOut,
  recordUniversityError,
  recordUniversityResult,
  ResearchCapacityError,
} from "@/lib/research-agent/registry";
import { parseResearchRequest } from "@/lib/research-agent/request";

/**
 * Start a research-agent run (admin only). Runs sequentially server-side;
 * progress is polled via /api/admin/research-agent/status. With the durable
 * store enabled, status, checkpoints, per-university reports, timeout,
 * cancellation and idempotency survive a process restart.
 */
export async function POST(req: Request) {
  try {
    const boundedJson = await readJsonBody<Record<string, any>>(req);
    if (!boundedJson.ok) return Response.json({ error: boundedJson.error, code: boundedJson.code }, { status: boundedJson.status });
    const body = boundedJson.body;
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const parsed = parseResearchRequest(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const request = parsed.request;
    const ids = request.universityIds;
    const rawKey = req.headers.get("Idempotency-Key");
    const idempotencyKey = rawKey ? rawKey.trim().slice(0, 200) || null : null;

    if (idempotencyKey) {
      const existing = await getIdempotentRunAsync(idempotencyKey);
      if (existing) {
        return NextResponse.json({ runId: existing.runId, queued: ids.length, deduplicated: true });
      }
    }

    const timeoutAt = Date.now() + AGENT_CONFIG.runTimeoutMs;
    const runId = createRun(ids[0], {
      idempotencyKey,
      timeoutAt,
      request,
      universityIds: ids,
      scopes: request.scopes,
    });
    setRun(runId, { state: "running" });
    appendProgress(runId, `Queueing ${ids.length} universit${ids.length === 1 ? "y" : "ies"}...`);

    const timer = setTimeout(() => {
      if (markRunTimedOut(runId)) {
        appendProgress(runId, "Run timed out; no further universities were started.");
      }
    }, AGENT_CONFIG.runTimeoutMs);
    if (typeof timer.unref === "function") timer.unref();

    // Run in background — do not block the request.
    void (async () => {
      try {
        const { reports, errors } = await runBatch(
          request,
          (universityId, message) => {
            if (isRunCancelled(runId)) return;
            setRun(runId, { universityId });
            appendProgress(runId, message);
          },
          () => isRunCancelled(runId),
          {
            onUniversityComplete: (report) => recordUniversityResult(runId, report),
            onUniversityError: (universityId, error) => recordUniversityError(runId, universityId, error),
          }
        );
        const last = reports[reports.length - 1] ?? null;
        if (isRunCancelled(runId)) {
          const wasTimedOut = getRun(runId)?.state === "timed_out";
          setRun(runId, {
            state: wasTimedOut ? "timed_out" : "cancelled",
            cancelRequested: true,
            report: last,
            error: "Run stopped by cancellation or timeout. Completed university reports remain available.",
            finishedAt: Date.now(),
          });
        } else {
          setRun(runId, {
            state: errors.length > 0 && reports.length === 0 ? "error" : "complete",
            report: last,
            error: errors.length > 0 ? errors.join("; ") : undefined,
            finishedAt: Date.now(),
          });
        }
        appendProgress(runId, errors.length > 0 ? `Finished with errors: ${errors.join("; ")}` : "Finished.");
      } catch (error: unknown) {
        // Catch the entire detached task, including progress/report callbacks.
        console.error("[research-run] background task failed:", error instanceof Error ? error.name : "unknown");
        setRun(runId, { state: "error", error: "Research run failed. Check server logs.", finishedAt: Date.now() });
      } finally {
        clearTimeout(timer);
      }
    })();

    return NextResponse.json({ runId, queued: ids.length, timeoutMs: AGENT_CONFIG.runTimeoutMs });
  } catch (error) {
    if (error instanceof ResearchCapacityError) return NextResponse.json({ error: error.message, code: "research_busy" }, { status: 429, headers: { "Retry-After": "30" } });
    console.error("POST /api/admin/research-agent/run error:", error);
    return NextResponse.json({ error: "Failed to start research run" }, { status: 500 });
  }
}
