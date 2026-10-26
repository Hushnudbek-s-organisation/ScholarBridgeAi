/**
 * Database side of the planner: read the publishable catalogue + history,
 * build the plan, and store it. No sending happens here — Phase 1 stops at a
 * stored plan (`CHANNEL_AUTOPOST=off|dryrun` never posts to the channel).
 */
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts, channelPrefs, channelStories, scholarships } from "@/db/schema";
import { localDay } from "@/lib/telegram/reminders";
import { CHANNEL_TZ, isFullyFunded, publishable } from "./model";
import { buildDailyPlan, planDedupeKey, type PlanHistoryRow, type PlanKind, type PlanStory, type PlannedItem } from "./plan";
import { topicKeys, type Candidate } from "./select";
import { buildFacts } from "./templates/facts";
import type { PollType } from "./templates/polls.uz";
import type { Kind } from "./templates/templates.uz";
import { ensureChannelTables } from "./db";

/** How far back history is read for cooldowns (longest is the 90-day story). */
const HISTORY_DAYS = 120;

export function planDateFor(now: Date): string {
  return localDay(now, CHANNEL_TZ);
}

function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function payloadOf(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export interface LoadedPlan {
  planDate: string;
  candidates: Candidate[];
  history: PlanHistoryRow[];
  prefs: Record<string, number>;
  stories: PlanStory[];
  /** Verified this week — a real number for Monday's recap. */
  newThisWeek: number;
  /** Posts actually delivered in the last 7 days. */
  publishedThisWeek: number;
}

export async function loadPlanInput(planDate: string, now: Date, siteUrl: string): Promise<LoadedPlan> {
  const since = shiftDay(planDate, HISTORY_DAYS);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const rows = await db
    .select()
    .from(scholarships)
    .where(
      and(
        eq(scholarships.isActive, true),
        eq(scholarships.verificationStatus, "verified"),
        isNotNull(scholarships.lastVerifiedAt)
      )
    );

  const candidates: Candidate[] = [];
  let newThisWeek = 0;
  for (const row of rows) {
    if (row.lastVerifiedAt && row.lastVerifiedAt >= weekAgo) newThisWeek++;
    if (!publishable(row, now).ok) continue;
    const facts = buildFacts(row, { now, siteUrl });
    const fullyFunded = isFullyFunded(row);
    candidates.push({
      facts,
      topics: topicKeys({
        country: row.country,
        degreeLevels: row.degreeLevels,
        eligibleMajors: row.eligibleMajors,
        fullyFunded,
      }),
    });
  }

  const planRows = await db
    .select({
      planDate: channelPlan.planDate,
      kind: channelPlan.kind,
      scholarshipId: channelPlan.scholarshipId,
      templateKey: channelPlan.templateKey,
      topic: channelPlan.topic,
      pollType: channelPlan.pollType,
      payload: channelPlan.payload,
    })
    .from(channelPlan)
    .where(gte(channelPlan.planDate, since));

  const history: PlanHistoryRow[] = planRows.map((row) => {
    const payload = payloadOf(row.payload);
    return {
      planDate: row.planDate,
      kind: row.kind as PlanKind,
      scholarshipId: row.scholarshipId ?? null,
      templateKey: row.templateKey,
      topic: row.topic ?? null,
      pollType: (row.pollType as PollType | null) ?? null,
      pollKey: typeof payload.pollKey === "string" ? payload.pollKey : null,
      storyId: typeof payload.storyId === "number" ? payload.storyId : null,
    };
  });

  const prefRows = await db.select({ topic: channelPrefs.topic, weight: channelPrefs.weight }).from(channelPrefs);
  const prefs: Record<string, number> = {};
  for (const row of prefRows) prefs[row.topic] = row.weight;

  const storyRows = await db
    .select({
      id: channelStories.id,
      title: channelStories.title,
      body: channelStories.body,
      authorLabel: channelStories.authorLabel,
    })
    .from(channelStories)
    .where(eq(channelStories.approved, true));

  const publishedRows = await db
    .select({ id: channelPosts.id })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "sent"), gte(channelPosts.sentAt, weekAgo)));

  return {
    planDate,
    candidates,
    history,
    prefs,
    stories: storyRows.map((s) => ({ id: s.id, title: s.title, body: s.body, authorLabel: s.authorLabel })),
    newThisWeek,
    publishedThisWeek: publishedRows.length,
  };
}

export interface PlanRunResult {
  planDate: string;
  quiet: boolean;
  planned: number;
  inserted: number;
  duplicates: number;
  candidates: number;
  items: PlannedItem[];
}

/**
 * Build and store today's plan. A second run on the same day inserts nothing:
 * the identity (`kind, scholarship, rung, date, slot`) is a unique row, plus a
 * NOT NULL dedupe key, so concurrent cron runs cannot double-book a post.
 */
export async function runDailyPlan(
  now: Date,
  opts: { siteUrl: string; discussionEnabled?: boolean; planDate?: string }
): Promise<PlanRunResult> {
  const planDate = opts.planDate ?? planDateFor(now);
  const loaded = await loadPlanInput(planDate, now, opts.siteUrl);
  const items = buildDailyPlan({
    planDate,
    candidates: loaded.candidates,
    history: loaded.history,
    prefs: loaded.prefs,
    stories: loaded.stories,
    discussionEnabled: opts.discussionEnabled ?? false,
    weekly: { newThisWeek: loaded.newThisWeek, published: loaded.publishedThisWeek },
  });

  let inserted = 0;
  for (const item of items) {
    const rows = await db
      .insert(channelPlan)
      .values({
        planDate,
        slot: item.slot,
        sendAt: item.sendAt,
        kind: item.kind as Kind | string,
        rung: item.rung,
        scholarshipId: item.scholarshipId,
        templateKey: item.templateKey,
        topic: item.topic,
        pollType: item.pollType,
        payload: JSON.stringify(item.payload),
        dedupeKey: planDedupeKey(item, planDate, item.slot),
        status: "planned",
        reason: item.reason,
      })
      .onConflictDoNothing({ target: channelPlan.dedupeKey })
      .returning({ id: channelPlan.id });
    if (rows.length) inserted++;
  }

  return {
    planDate,
    quiet: items.length === 0,
    planned: items.length,
    inserted,
    duplicates: items.length - inserted,
    candidates: loaded.candidates.length,
    items,
  };
}

/** Ensure the tables exist before the first plan (lazy DDL, like the bot). */
export async function ensureChannelPlanTables(): Promise<boolean> {
  return ensureChannelTables();
}
