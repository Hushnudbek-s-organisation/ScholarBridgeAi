import { readJsonBody } from "@/lib/request";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  buildReviewItems, decideReviewItem, summarizeReviewQueue,
} from "@/lib/reviewQueue";
import { loadQueueInput, persistDecision } from "@/lib/reviewQueueStore.server";
import { newRequestId, logSafe, safeErrorMessage } from "@/lib/observability";

/**
 * Admin review queue (§11).
 *
 * GET builds the queue from typed facts, failed official-source checks, failed
 * refresh/research jobs and duplicate candidates. POST applies ONE explicit
 * human decision. Neither endpoint marks a fact `verified`, and neither reads
 * or logs tokens, passwords, document bodies or PII. The queue tables come from
 * the reviewable migration; when it is not applied, the GET returns a clear
 * `migrationPending` flag with an empty queue (never a fabricated "all clear").
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const input = await loadQueueInput();
    const items = input.migrationPending
      ? []
      : buildReviewItems({ ...input, nowIso: new Date().toISOString() });
    return NextResponse.json({
      items,
      summary: summarizeReviewQueue(items),
      migrationPending: input.migrationPending,
      // A partial result is NEVER presented as a complete "all clear".
      partialFailures: input.partialFailures,
      note: input.migrationPending
        ? "catalogue_facts migration is not applied; no queue rows are available. Apply supabase/security_evidence_research_2026-11-06.sql."
        : input.partialFailures.length
          ? `Queue is PARTIAL — these sources failed: ${input.partialFailures.join(", ")}. Other sources still contributed items; decisions are disabled until all sources are healthy.`
          : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load review queue" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const bounded = await readJsonBody<Record<string, unknown>>(req);
    if (!bounded.ok) return NextResponse.json({ error: bounded.error, code: bounded.code }, { status: bounded.status });
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const body = bounded.body;
    const decision = String(body.decision ?? "");
    if (!["resolve", "dismiss", "start_review"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    const reason = String(body.reason ?? "").slice(0, 500);
    const itemKey = String(body.itemKey ?? "").slice(0, 300);
    if (!itemKey) return NextResponse.json({ error: "itemKey is required" }, { status: 400 });

    // Rebuild the item from the same inputs so the server never trusts a
    // client-supplied status/priority/reason as authoritative.
    const input = await loadQueueInput();
    if (input.migrationPending) {
      return NextResponse.json({ error: "Review queue migration is not applied; decisions are unavailable." }, { status: 503 });
    }
    // A decision built on a PARTIAL queue could silently ignore a failed
    // source. Refuse the write, name the sources, keep the queue state intact.
    if (input.partialFailures.length) {
      logSafe("review_queue.decision_deferred", { requestId, itemKey, sources: input.partialFailures.length });
      return NextResponse.json(
        { error: "Review queue is partial; no decision was recorded.", partialFailures: input.partialFailures, decisionRecorded: false },
        { status: 503 },
      );
    }
    const current = buildReviewItems({ ...input, nowIso: new Date().toISOString() }).find((i) => i.itemKey === itemKey);
    if (!current) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });

    const result = decideReviewItem(current, {
      itemKey, decision: decision as "resolve" | "dismiss" | "start_review",
      reason, adminProfileId: access.session.profile.id,
    });
    if (!result.ok) {
      logSafe("review_queue.rejected", { requestId, itemKey, reasonText: result.error });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const persisted = await persistDecision(result.item);
    // A decision is NEVER a catalogue verification write. The item key/category
    // are safe to log; the written reason and any admin identity are NOT.
    logSafe("review_queue.decision", {
      requestId, itemKey, category: result.item.category,
      status: result.item.status, persisted, verifiedWritten: false,
    });
    return NextResponse.json({ ok: true, item: result.item, persisted, verifiedWritten: false, requestId });
  } catch (err) {
    logSafe("review_queue.error", { requestId, errorClass: safeErrorMessage(err) });
    return NextResponse.json({ error: "Failed to apply decision" }, { status: 500 });
  }
}
