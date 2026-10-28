/**
 * The database half of "nega post ketmayapti?" — gathers the snapshot that
 * `why.ts` turns into a verdict.
 *
 * Everything here is read-only except the heartbeat write, which the publisher
 * already does on every tick. Nothing in this file sends a message.
 */
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { channelAudit, channelPlan, channelPosts, scholarships } from "@/db/schema";
import { deadlineInfo, publishable } from "./model";
import { resolveChannelRuntime, tashkentDay } from "./config";
import { checkChannelConnection } from "./connect";
import { loadChannelSettings } from "./repo";
import { writeChannelAudit } from "./repo";
import { getChannelBotToken } from "./token";
import { autopilotIntervalMinutes } from "./autopilot";
import { buildWhy, type CatalogueCounts, type PlanCounts, type TickInfo, type WhyInput, type WhyVerdict } from "./why";

/** A catalogue this small cannot keep a daily channel fed for long. */
export const THIN_CATALOGUE = 10;

export interface ChannelWhyResult extends WhyVerdict {
  catalogue: CatalogueCounts;
  plan: PlanCounts;
  tick: TickInfo & { lastTickMinutes: number | null };
  lastDeliveredAt: string | null;
  /** True when the pool is below THIN_CATALOGUE — worth saying out loud. */
  catalogueThin: boolean;
  now: string;
}

/** The heartbeat row the tick writes; read here to prove the scheduler runs. */
export async function recordTick(source: "cron" | "loop", summary: Record<string, unknown> = {}): Promise<void> {
  await writeChannelAudit({
    actorProfileId: null,
    action: "tick",
    entity: "cron",
    entityId: source,
    after: { source, at: new Date().toISOString(), ...summary },
  });
}

async function lastTick(source?: "cron" | "loop"): Promise<Date | null> {
  try {
    const rows = await db
      .select({ createdAt: channelAudit.createdAt })
      .from(channelAudit)
      .where(eq(channelAudit.action, "tick"))
      .orderBy(desc(channelAudit.createdAt))
      .limit(5);
    if (!rows.length) return null;
    // Either tick keeps the publisher alive, so the newest one wins.
    void source;
    return rows[0].createdAt;
  } catch {
    return null;
  }
}

/**
 * Count the catalogue the way the publisher sees it.
 *
 * `publishable()` is the single gate, so it is called here instead of being
 * re-implemented in SQL: a count that disagrees with the planner would be worse
 * than no count at all.
 */
export async function catalogueCounts(now: Date): Promise<CatalogueCounts> {
  // Whole rows, not a projection: `publishable()` is the single gate and it
  // reads most of the row, so selecting columns here would only drift from it.
  const rows = await db.select().from(scholarships);

  const counts: CatalogueCounts = {
    total: rows.length,
    active: 0,
    verified: 0,
    stale: 0,
    publishable: 0,
    withExactDeadline: 0,
  };

  for (const row of rows) {
    if (row.isActive) counts.active++;
    const verified = row.verificationStatus === "verified" && row.lastVerifiedAt !== null;
    if (verified) counts.verified++;
    const check = publishable(row, now);
    if (check.ok) {
      counts.publishable++;
      if (deadlineInfo(row, now).quality === "exact") counts.withExactDeadline++;
    } else if (check.reason === "verification_stale") {
      // The one reason an operator fixes by pressing "verify" on the row.
      counts.stale++;
    }
  }
  return counts;
}

export async function planCounts(now: Date): Promise<PlanCounts> {
  const day = tashkentDay(now);
  const rows = await db
    .select({ id: channelPlan.id, status: channelPlan.status, sendAt: channelPlan.sendAt })
    .from(channelPlan)
    .where(eq(channelPlan.planDate, day));

  /**
   * A plan row keeps the status `planned` even after its post was handed over —
   * the post row carries the real state. Counting them as "open" would tell the
   * operator to expect a post that already went out.
   */
  const consumed = rows.length
    ? await db
        .select({ planId: channelPosts.planId })
        .from(channelPosts)
        .where(inArray(channelPosts.planId, rows.map((row) => row.id)))
    : [];
  const used = new Set(consumed.map((row) => row.planId));

  const open = rows
    .filter((row) => row.status === "planned" && !used.has(row.id))
    .sort((a, b) => a.sendAt.localeCompare(b.sendAt));
  return {
    date: day,
    planned: rows.length,
    open: open.length,
    sent: rows.filter((row) => row.status === "sent").length,
    awaiting: rows.filter((row) => row.status === "awaiting_approval").length,
    nextSendAt: open[0]?.sendAt ?? null,
  };
}

/** The last post Telegram accepted (or the admin chat received, in dry run). */
async function lastDelivery(now: Date): Promise<{ at: Date | null; failure: string | null }> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const delivered = await db
    .select({ createdAt: channelPosts.createdAt })
    .from(channelPosts)
    .where(
      and(
        inArray(channelPosts.status, ["sent", "dryrun", "awaiting_approval"]),
        gte(channelPosts.createdAt, since)
      )
    )
    .orderBy(desc(channelPosts.createdAt))
    .limit(1);

  const failed = await db
    .select({ error: channelPosts.error })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "failed"), gte(channelPosts.createdAt, since)))
    .orderBy(desc(channelPosts.createdAt))
    .limit(1);

  return { at: delivered[0]?.createdAt ?? null, failure: failed[0]?.error ?? null };
}

/**
 * The whole answer to "why is nothing arriving?".
 *
 * The live connection check is wrapped: a Telegram outage must not turn this
 * diagnosis into an error page — it becomes "channel unreachable", which is
 * exactly what the operator needs to see.
 */
export async function channelWhy(now: Date = new Date()): Promise<ChannelWhyResult> {
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings, process.env, now);

  const [catalogue, plan, tickAt, delivery] = await Promise.all([
    catalogueCounts(now),
    planCounts(now),
    lastTick(),
    lastDelivery(now),
  ]);

  const token = await getChannelBotToken();
  let connection: WhyInput["connection"] = null;
  if (token.token) {
    try {
      const check = await checkChannelConnection(runtime);
      connection = {
        channelConfigured: check.channel.configured,
        channelReachable: check.channel.reachable,
        channelType: check.channel.type,
        canPost: check.channel.canPost,
        adminChatReachable: check.adminChat.reachable,
      };
    } catch {
      connection = {
        channelConfigured: Boolean(runtime.channelId),
        channelReachable: false,
        channelType: null,
        canPost: false,
        adminChatReachable: false,
      };
    }
  }

  const interval = autopilotIntervalMinutes();
  const tick: TickInfo = { lastTickAt: tickAt, intervalMinutes: interval };
  const verdict = buildWhy({
    now,
    mode: runtime.mode,
    pausedUntil: runtime.pausedUntil,
    envAutopost: runtime.envAutopost,
    hasToken: Boolean(token.token),
    channelId: runtime.channelId,
    adminChatId: runtime.adminChatId,
    siteUrl: runtime.siteUrl,
    connection,
    catalogue,
    plan,
    tick,
    lastDeliveredAt: delivery.at,
    lastFailure: delivery.failure,
  });

  return {
    ...verdict,
    catalogue,
    plan,
    tick: {
      ...tick,
      lastTickMinutes: tickAt ? Math.round((now.getTime() - tickAt.getTime()) / 60_000) : null,
    },
    lastDeliveredAt: delivery.at ? delivery.at.toISOString() : null,
    catalogueThin: catalogue.publishable > 0 && catalogue.publishable < THIN_CATALOGUE,
    now: now.toISOString(),
  };
}

/**
 * Rows that will never be published until someone touches them — the actionable
 * list behind "the catalogue is the reason".
 */
export async function unpublishedCatalogue(now: Date, limit = 20) {
  const rows = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.isActive, true))
    .orderBy(desc(scholarships.id))
    .limit(300);

  const out: { id: number; title: string; country: string; reason: string; lastVerifiedAt: string | null }[] = [];
  for (const row of rows) {
    const check = publishable(row, now);
    if (check.ok) continue;
    out.push({
      id: row.id,
      title: row.title,
      country: row.country ?? "",
      reason: check.reason ?? "unknown",
      lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
