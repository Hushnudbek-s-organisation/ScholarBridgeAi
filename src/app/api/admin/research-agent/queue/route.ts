import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/request";
import {
  approvedFieldKeys,
  decideQueueItem,
  mergeQueues,
  queueSummary,
  type QueueDecision,
  type QueueItem,
} from "@/lib/research-agent/approvalQueue";

export const dynamic = "force-dynamic";

/** Where the research-agent queue lives (no schema change: app_config is keyed). */
const QUEUE_KEY = "research_agent_queue";
const MAX_ITEMS = 500;
const DECISIONS: QueueDecision[] = ["pending", "approved", "rejected"];

/**
 * Research-agent approval queue (spec §5.4) — admin only.
 *
 * The queue is stored server-side so two operators do not each hold a private
 * copy of the diff. Values are kept verbatim: reading and writing this endpoint
 * never edits a proposed value.
 */
async function readQueue(): Promise<QueueItem[]> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, QUEUE_KEY));
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  const value = JSON.stringify(items.slice(0, MAX_ITEMS));
  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, QUEUE_KEY));
  if (existing) {
    await db.update(appConfig).set({ value, updatedAt: new Date() }).where(eq(appConfig.key, QUEUE_KEY));
    return;
  }
  await db.insert(appConfig).values({
    key: QUEUE_KEY,
    value,
    description: "Research-agent approval queue (spec §5.4) — field-level proposals awaiting a decision.",
  });
}

/** GET — the current queue plus its summary and the apply allow-list. */
export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const items = await readQueue();
    return NextResponse.json({
      items,
      summary: queueSummary(items),
      approvedFields: approvedFieldKeys(items),
    });
  } catch (error) {
    console.error("GET /api/admin/research-agent/queue error:", error);
    return NextResponse.json({ error: "Failed to load the approval queue" }, { status: 500 });
  }
}

/**
 * POST — three admin actions:
 *   { queue: QueueItem[] }         merge a fresh run report into the queue
 *   { id, decision }               answer one proposal
 *   { decision, ids: string[] }    answer several at once (1-click bulk)
 *   { clear: true }                drop decided items (keeps pending ones)
 */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    let items = await readQueue();

    if (body.clear === true) {
      items = items.filter((item) => item.decision === "pending");
    }

    if (Array.isArray(body.queue)) {
      // The client never supplies the identity fields — they are rebuilt from
      // the item's own proposal so a tampered payload cannot relabel a field.
      const incoming: QueueItem[] = (body.queue as QueueItem[])
        .filter((item) => item && typeof item.id === "string" && typeof item.field === "string")
        .slice(0, MAX_ITEMS)
        .map((item) => ({
          ...item,
          decision: DECISIONS.includes(item.decision) ? item.decision : "pending",
        }));
      items = mergeQueues(items, incoming);
    }

    const ids = Array.isArray(body.ids)
      ? (body.ids as unknown[]).filter((v): v is string => typeof v === "string")
      : typeof body.id === "string"
        ? [body.id]
        : [];

    if (ids.length > 0) {
      const decision = body.decision as QueueDecision;
      if (!DECISIONS.includes(decision)) {
        return NextResponse.json({ error: "decision must be pending, approved or rejected" }, { status: 400 });
      }
      for (const id of ids) items = decideQueueItem(items, id, decision);
    }

    if (body.clear !== true && !Array.isArray(body.queue) && ids.length === 0) {
      return NextResponse.json({ error: "nothing to do: send queue, id/ids+decision, or clear" }, { status: 400 });
    }

    await writeQueue(items);
    return NextResponse.json({
      items,
      summary: queueSummary(items),
      approvedFields: approvedFieldKeys(items),
    });
  } catch (error) {
    console.error("POST /api/admin/research-agent/queue error:", error);
    return NextResponse.json({ error: "Failed to update the approval queue" }, { status: 500 });
  }
}
