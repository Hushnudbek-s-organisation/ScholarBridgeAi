/**
 * Polls, preference weights and curated stories — the three "learning" tables.
 *
 * Everything here is admin- or webhook-driven; the planner only reads. Two
 * invariants matter:
 *
 *  1. A vote is never stored. `channel_polls.results` only ever holds per-option
 *     counters that Telegram aggregates itself.
 *  2. A story is only postable after an admin approved it. Nothing here can
 *     publish something an admin did not write and approve.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { channelPolls, channelPosts, channelPrefs, channelStories } from "@/db/schema";
import { ensureChannelTables } from "./db";
import { clampWeight } from "./prefs";
import {
  parsePollResult,
  pollSpecByKey,
  prefUpdatesFromPoll,
  serializePollResult,
  type PollResult,
  type TgPollLike,
} from "./polls";

/* ------------------------------------------------------------------ */
/* Polls                                                               */
/* ------------------------------------------------------------------ */

export interface PollRow {
  id: number;
  pollId: string | null;
  pollType: string;
  pollKey: string;
  topic: string | null;
  question: string;
  options: string;
  status: string;
  results: string;
  totalVoters: number | null;
  openedAt: Date;
  closedAt: Date | null;
}

export async function insertPoll(input: {
  postId: number;
  messageId: number | null;
  pollId: string | null;
  pollType: string;
  pollKey: string;
  topic: string | null;
  question: string;
  options: { key: string; text: string }[];
  correctIndex: number | null;
}): Promise<number | null> {
  if (!(await ensureChannelTables())) return null;
  const rows = await db
    .insert(channelPolls)
    .values({
      postId: input.postId,
      messageId: input.messageId,
      pollId: input.pollId,
      pollType: input.pollType,
      pollKey: input.pollKey,
      topic: input.topic,
      question: input.question,
      options: JSON.stringify(input.options),
      correctIndex: input.correctIndex,
      status: "open",
    })
    .onConflictDoNothing({ target: channelPolls.postId })
    .returning({ id: channelPolls.id });
  return rows[0]?.id ?? null;
}

export async function listPolls(limit = 50): Promise<PollRow[]> {
  if (!(await ensureChannelTables())) return [];
  const rows = await db.select().from(channelPolls).orderBy(desc(channelPolls.openedAt)).limit(limit);
  return rows.map((row) => ({
    id: row.id,
    pollId: row.pollId,
    pollType: row.pollType,
    pollKey: row.pollKey,
    topic: row.topic,
    question: row.question,
    options: row.options,
    status: row.status,
    results: row.results,
    totalVoters: row.totalVoters,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
  }));
}

export async function findPollByTelegramId(pollId: string): Promise<PollRow | null> {
  if (!pollId || !(await ensureChannelTables())) return null;
  const rows = await db.select().from(channelPolls).where(eq(channelPolls.pollId, pollId)).limit(1);
  return (rows[0] as PollRow | undefined) ?? null;
}

export interface PollApplyResult {
  stored: boolean;
  /** Only true the first time a poll's numbers reach us, so prefs move once. */
  appliedPrefs: { topic: string; weight: number }[];
}

/**
 * Store one aggregate snapshot and, the first time it arrives, blend the vote
 * shares into `channel_prefs`. Idempotent: Telegram may deliver the same final
 * `poll` update twice, and `pref_samples` (here: the poll's own status) guards
 * against counting it twice.
 */
export async function applyPollResult(input: {
  pollId: string;
  poll: TgPollLike;
}): Promise<PollApplyResult> {
  const row = await findPollByTelegramId(input.pollId);
  if (!row) return { stored: false, appliedPrefs: [] };
  const spec = pollSpecByKey(row.pollKey);
  const result: PollResult = parsePollResult(spec, { ...input.poll, id: input.pollId });
  const closed = result.closed || row.status === "closed";
  // Intermediate snapshots are stored but do not teach the planner: only the
  // final (closed) numbers are a full sample, and they are learned exactly once.
  const firstResult = closed && row.status === "open" && result.totalVoters > 0;

  await db
    .update(channelPolls)
    .set({
      results: serializePollResult(result),
      totalVoters: result.totalVoters,
      status: closed ? "closed" : row.status,
      pollId: input.pollId,
      closedAt: closed ? (row.closedAt ?? new Date()) : null,
    })
    .where(eq(channelPolls.id, row.id));

  if (!firstResult) return { stored: true, appliedPrefs: [] };

  const applied = await applyPrefUpdates(spec, result);
  return { stored: true, appliedPrefs: applied };
}

/** Blend vote shares into the weights, once per poll. */
async function applyPrefUpdates(
  spec: ReturnType<typeof pollSpecByKey>,
  result: PollResult
): Promise<{ topic: string; weight: number }[]> {
  const current: Record<string, number> = {};
  const existing = await db.select({ topic: channelPrefs.topic, weight: channelPrefs.weight }).from(channelPrefs);
  for (const row of existing) current[row.topic] = row.weight;
  const updates = prefUpdatesFromPoll(spec, result, current);
  for (const update of updates) {
    await db
      .insert(channelPrefs)
      .values({ topic: update.topic, weight: update.weight, samples: 1 })
      .onConflictDoUpdate({
        target: channelPrefs.topic,
        set: { weight: update.weight, samples: sql`${channelPrefs.samples} + 1`, updatedAt: new Date() },
      });
  }
  return updates;
}

/** Where a poll was posted — needed to stop it (stopPoll works by chat+message). */
export async function pollTarget(
  id: number
): Promise<{ poll: PollRow; chatId: string | null; messageId: number | null } | null> {
  if (!(await ensureChannelTables())) return null;
  const rows = await db
    .select({
      poll: channelPolls,
      chatId: channelPosts.chatId,
      messageId: channelPosts.messageId,
    })
    .from(channelPolls)
    .leftJoin(channelPosts, eq(channelPosts.id, channelPolls.postId))
    .where(eq(channelPolls.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { poll: row.poll as PollRow, chatId: row.chatId ?? null, messageId: row.messageId ?? null };
}

/** Admin action: close a poll now and store the final aggregate. */
export async function closePollLocally(id: number): Promise<boolean> {
  if (!(await ensureChannelTables())) return false;
  const rows = await db
    .update(channelPolls)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(channelPolls.id, id), eq(channelPolls.status, "open")))
    .returning({ id: channelPolls.id });
  return rows.length > 0;
}

/* ------------------------------------------------------------------ */
/* Preference weights                                                  */
/* ------------------------------------------------------------------ */

export interface PrefRow {
  topic: string;
  weight: number;
  samples: number;
  updatedAt: Date;
}

export async function listPrefs(): Promise<PrefRow[]> {
  if (!(await ensureChannelTables())) return [];
  const rows = await db.select().from(channelPrefs).orderBy(channelPrefs.topic);
  return rows.map((row) => ({ topic: row.topic, weight: row.weight, samples: row.samples, updatedAt: row.updatedAt }));
}

export async function setPref(topic: string, weight: number): Promise<boolean> {
  if (!/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/.test(topic)) return false;
  if (!Number.isFinite(weight)) return false;
  if (!(await ensureChannelTables())) return false;
  const value = clampWeight(weight);
  await db
    .insert(channelPrefs)
    .values({ topic, weight: value, samples: 0 })
    .onConflictDoUpdate({ target: channelPrefs.topic, set: { weight: value, updatedAt: new Date() } });
  return true;
}

/** Back to neutral: every weight 1.0, learned counts cleared. */
export async function resetPrefs(): Promise<number> {
  if (!(await ensureChannelTables())) return 0;
  const rows = await db
    .update(channelPrefs)
    .set({ weight: 1, samples: 0, updatedAt: new Date() })
    .returning({ topic: channelPrefs.topic });
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Stories                                                             */
/* ------------------------------------------------------------------ */

export interface StoryRow {
  id: number;
  title: string;
  body: string;
  authorLabel: string | null;
  sourceUrl: string | null;
  approved: boolean;
  createdAt: Date;
}

export async function listStories(limit = 100): Promise<StoryRow[]> {
  if (!(await ensureChannelTables())) return [];
  const rows = await db.select().from(channelStories).orderBy(desc(channelStories.createdAt)).limit(limit);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    authorLabel: row.authorLabel,
    sourceUrl: row.sourceUrl,
    approved: row.approved,
    createdAt: row.createdAt,
  }));
}

export async function upsertStory(input: {
  id?: number | null;
  title: string;
  body: string;
  authorLabel: string | null;
  sourceUrl: string | null;
  approved: boolean;
  actorProfileId: number;
}): Promise<number | null> {
  if (!(await ensureChannelTables())) return null;
  const approval = input.approved
    ? { approved: true, approvedBy: input.actorProfileId, approvedAt: new Date() }
    : { approved: false, approvedBy: null, approvedAt: null };
  if (input.id) {
    const rows = await db
      .update(channelStories)
      .set({ title: input.title, body: input.body, authorLabel: input.authorLabel, sourceUrl: input.sourceUrl, ...approval })
      .where(eq(channelStories.id, input.id))
      .returning({ id: channelStories.id });
    return rows[0]?.id ?? null;
  }
  const rows = await db
    .insert(channelStories)
    .values({
      title: input.title,
      body: input.body,
      authorLabel: input.authorLabel,
      sourceUrl: input.sourceUrl,
      ...approval,
    })
    .returning({ id: channelStories.id });
  return rows[0]?.id ?? null;
}

export async function setStoryApproved(id: number, approved: boolean, actorProfileId: number): Promise<boolean> {
  if (!(await ensureChannelTables())) return false;
  const rows = await db
    .update(channelStories)
    .set({
      approved,
      approvedBy: approved ? actorProfileId : null,
      approvedAt: approved ? new Date() : null,
    })
    .where(eq(channelStories.id, id))
    .returning({ id: channelStories.id });
  return rows.length > 0;
}

export async function deleteStory(id: number): Promise<boolean> {
  if (!(await ensureChannelTables())) return false;
  const rows = await db.delete(channelStories).where(eq(channelStories.id, id)).returning({ id: channelStories.id });
  return rows.length > 0;
}

/** How many approved stories are waiting to be used by the planner. */
export async function approvedStoryCount(): Promise<number> {
  if (!(await ensureChannelTables())) return 0;
  const rows = await db.select({ id: channelStories.id }).from(channelStories).where(eq(channelStories.approved, true));
  return rows.length;
}
