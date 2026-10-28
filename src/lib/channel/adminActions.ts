/**
 * Admin-initiated actions on the publisher: build today's plan, send what is
 * due, and the small summary the dashboard header shows.
 *
 * These are the same code paths the cron job uses — the admin buttons cannot
 * bypass validation, only the daily cap (an explicit, logged override).
 */
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts } from "@/db/schema";
import { resolveChannelRuntime, tashkentDay } from "./config";
import { ensureChannelTables } from "./db";
import { ensurePlanLinks, todayQueue } from "./admin";
import { loadChannelSettings, writeChannelAudit } from "./repo";
import { runDuePosts, sendPlanRow } from "./send";
import { retireStalePlans, runDailyPlan } from "./store";
import { expireStaleApprovals } from "./approvalStore";

export interface PlanRunSummary {
  planDate: string;
  planned: number;
  inserted: number;
  duplicates: number;
  candidates: number;
  quiet: boolean;
  blockedReason: string | null;
}

/** Build today's plan (idempotent — a second run inserts nothing). */
export async function runPlanForToday(actorProfileId: number | null): Promise<PlanRunSummary> {
  await ensureChannelTables();
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const result = await runDailyPlan(new Date(), {
    siteUrl: runtime.siteUrl,
    discussionEnabled: runtime.discussionEnabled,
    settings,
  });
  const links = await ensurePlanLinks();
  await writeChannelAudit({
    actorProfileId,
    action: "plan_run",
    entity: "plan",
    entityId: result.planDate,
    after: { planned: result.planned, inserted: result.inserted, links },
  });
  return {
    planDate: result.planDate,
    planned: result.planned,
    inserted: result.inserted,
    duplicates: result.duplicates,
    candidates: result.candidates,
    quiet: result.quiet,
    blockedReason: runtime.blockedReason,
  };
}

export interface RunPostsSummary {
  attempted: number;
  sent: number;
  dryrun: number;
  /** Sent to the admin chat and now waiting for a human (approval mode). */
  approval: number;
  failed: number;
  skipped: number;
  /** Posts retired because nobody answered within the approval window. */
  expired: number;
  /** Queue rows from earlier days that can never be sent any more. */
  retired: number;
  reasons: string[];
  blockedReason: string | null;
}

/** Send everything that is due right now (at most the daily cap). */
export async function runPostsNow(actorProfileId: number | null, opts: { force?: boolean } = {}): Promise<RunPostsSummary> {
  await ensureChannelTables();
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);

  /**
   * Approval mode without an admin chat still runs: the previews cannot be
   * delivered, but the queue is built and the posts wait in the panel, where
   * they can be approved. Every other block still blocks.
   */
  const panelOnly = runtime.mode === "approval" && runtime.blockedCode === "no_admin_chat";
  if (!opts.force && runtime.blockedReason && !panelOnly) {
    return {
      attempted: 0,
      sent: 0,
      dryrun: 0,
      approval: 0,
      failed: 0,
      skipped: 0,
      expired: 0,
      retired: 0,
      reasons: [runtime.blockedReason],
      blockedReason: runtime.blockedReason,
    };
  }

  // Retire previews nobody answered before planning anything new: approving a
  // stale post later would publish yesterday's news under today's date.
  const expired = await expireStaleApprovals().catch(() => 0);
  // Yesterday's queue cannot be sent (the sender is date-scoped), so retire it
  // explicitly instead of leaving rows that look pending forever.
  const retired = await retireStalePlans(tashkentDay()).catch(() => 0);

  const day = tashkentDay();
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPlan)
    .where(eq(channelPlan.planDate, day));
  if (Number(existing?.count ?? 0) === 0) await runPlanForToday(actorProfileId);

  const outcomes = await runDuePosts(new Date(), Math.min(3, settings.plan.dailyCap));
  const summary: RunPostsSummary = {
    attempted: outcomes.length,
    sent: outcomes.filter((o) => o.status === "sent").length,
    dryrun: outcomes.filter((o) => o.status === "dryrun").length,
    approval: outcomes.filter((o) => o.status === "approval").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    expired,
    retired,
    reasons: outcomes.map((o) => o.reason).filter((r): r is string => Boolean(r)),
    blockedReason: runtime.blockedReason,
  };
  await writeChannelAudit({ actorProfileId, action: "posts_run", entity: "post", after: summary });
  return summary;
}

/** Explicit "send this one now", used by the queue row action. */
export async function postNow(planId: number, actorProfileId: number, opts: { toAdminChat?: boolean } = {}) {
  const [row] = await db.select().from(channelPlan).where(eq(channelPlan.id, planId)).limit(1);
  if (!row) return { ok: false as const, error: "not_found" };
  /**
   * "Hozir yuborish" publishes to the channel even in approval mode: the
   * operator has read the preview and pressed the button that says "send".
   * "Test post" is the opposite — it always goes to the admin chat.
   */
  const outcome = await sendPlanRow(row, {
    force: true,
    toAdminChat: opts.toAdminChat,
    direct: !opts.toAdminChat,
    actorProfileId,
  });
  await writeChannelAudit({
    actorProfileId,
    action: opts.toAdminChat ? "post_test" : "post_now",
    entity: "plan",
    entityId: String(planId),
    after: { status: outcome.status, reason: outcome.reason },
  });
  return { ok: outcome.ok, outcome } as const;
}

export interface ChannelStatusSummary {
  planDate: string;
  planned: number;
  sentToday: number;
  failedToday: number;
  queue: Awaited<ReturnType<typeof todayQueue>>;
  blockedReason: string | null;
  mode: string;
}

export async function channelAdminSummary(): Promise<ChannelStatusSummary> {
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const day = tashkentDay();
  const midnight = new Date(`${day}T00:00:00+05:00`);
  const [planned] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPlan)
    .where(and(eq(channelPlan.planDate, day), eq(channelPlan.status, "planned")));
  const [sent] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "sent"), gte(channelPosts.sentAt, midnight)));
  const [failed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "failed"), gte(channelPosts.createdAt, midnight)));
  return {
    planDate: day,
    planned: Number(planned?.count ?? 0),
    sentToday: Number(sent?.count ?? 0),
    failedToday: Number(failed?.count ?? 0),
    queue: await todayQueue(day),
    blockedReason: runtime.blockedReason,
    mode: runtime.mode,
  };
}
