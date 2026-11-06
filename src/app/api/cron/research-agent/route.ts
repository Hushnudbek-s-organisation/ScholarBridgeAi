import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { probeDurableMigration } from "@/lib/research-agent/durableStore";
import { resumeResearchRuns } from "@/lib/research-agent/worker";
import { newRequestId, logSafe, safeErrorMessage } from "@/lib/observability";

/**
 * §9 — the ONE production scheduler path for the Research Agent.
 *
 * Infrastructure: a Render Cron Job (or any external scheduler) calls this
 * GET every 5 minutes with `Authorization: Bearer $CRON_SECRET`. It is NOT an
 * in-process timer: a restart loses nothing because `resumeResearchRuns()`
 * reads the durable DB, claims a stale run with an atomic lease and resumes
 * only unfinished items.
 *
 * Call order: build → migration → RESEARCH_DURABLE_STORE=1 → CRON_SECRET →
 * enable this Cron Job → smoke test. Applying the flag before the migration is
 * safe and returns a clear 503 with an actionable reason (no run is started).
 *
 * Parallel limit: `limit: 1` per tick; the atomic lease means a second
 * overlapping tick cannot claim the same run. Monitoring: the JSON summary
 * (expired/considered/claimed/resumed/finished/skipped/errors) plus safe
 * request-id logs; the admin status/list endpoints read the same durable rows.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = newRequestId();
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      logSafe("research_agent.cron.refused", { requestId, reason: "CRON_SECRET missing" });
      return NextResponse.json(
        { error: "CRON_SECRET not configured — set it to enable the Research Agent scheduler", migrationPending: false },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const auth = req.headers.get("authorization") || "";
    if (!safeEqual(auth, `Bearer ${secret}`)) {
      logSafe("research_agent.cron.refused", { requestId, reason: "invalid bearer" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const probe = await probeDurableMigration();
    if (!probe.enabled || !probe.migrationApplied) {
      // Clear error + SAFE state: nothing is claimed, nothing is written.
      logSafe("research_agent.cron.migration_pending", { requestId, reason: probe.reason });
      return NextResponse.json(
        { ok: false, enabled: probe.enabled, migrationPending: !probe.migrationApplied, reason: probe.reason, runsStarted: 0 },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const summary = await resumeResearchRuns({ limit: 1 });
    logSafe("research_agent.cron.tick", {
      requestId, expired: summary.expired, considered: summary.considered,
      claimed: summary.claimed, resumed: summary.resumed, finished: summary.finished,
      skipped: summary.skipped, errorCount: summary.errors.length,
    });
    return NextResponse.json(
      { ok: true, requestId, ...summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logSafe("research_agent.cron.error", { requestId, errorClass: safeErrorMessage(error) });
    return NextResponse.json(
      { error: "Research Agent scheduler tick failed", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
