/**
 * The database half of the approval step.
 *
 * Kept apart from `./approval.ts` (which is pure) so the rules stay testable
 * without a connection, and apart from `./send.ts` (which publishes) so there
 * is exactly one module that talks to Telegram.
 */
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { channelPosts, studentProfiles, telegramLinks } from "@/db/schema";
import { approvalTtlHours, APPROVAL_STATUS, OPEN_APPROVAL_STATUSES } from "./approval";

/* -------------------------------------------------------------------------- */
/* Who is allowed to press the buttons                                        */
/* -------------------------------------------------------------------------- */

export interface ChannelApprover {
  profileId: number;
  /** Admin flag from `student_profiles.is_admin`. */
  isAdmin: boolean;
  name: string | null;
}

/**
 * Resolve a Telegram id to a profile, so a button press can be authorised.
 *
 * Two conditions, both required: the Telegram account is linked to a profile,
 * and that profile is an admin. A stranger who guesses the chat, or an ordinary
 * student whose account is linked, gets nothing — the query returns the row and
 * the caller decides, so the refusal message can say "only an admin".
 */
export async function resolveChannelApprover(telegramUserId: string | number): Promise<ChannelApprover | null> {
  const id = String(telegramUserId ?? "").trim();
  if (!/^\d{5,20}$/.test(id)) return null;
  const rows = await db
    .select({ profileId: telegramLinks.profileId, isAdmin: studentProfiles.isAdmin, name: studentProfiles.name })
    .from(telegramLinks)
    .innerJoin(studentProfiles, eq(studentProfiles.id, telegramLinks.profileId))
    .where(eq(telegramLinks.telegramUserId, id))
    .limit(1);
  const row = rows[0];
  return row ? { profileId: row.profileId, isAdmin: row.isAdmin === true, name: row.name ?? null } : null;
}

/* -------------------------------------------------------------------------- */
/* Reading and expiring                                                       */
/* -------------------------------------------------------------------------- */

export interface PendingApproval {
  postId: number;
  planId: number | null;
  kind: string;
  slot: number | null;
  status: string;
  html: string | null;
  messageId: number | null;
  createdAt: Date;
}

/** Posts currently waiting for a human, newest first. */
export async function pendingApprovals(limit = 20): Promise<PendingApproval[]> {
  const rows = await db
    .select({
      postId: channelPosts.id,
      planId: channelPosts.planId,
      kind: channelPosts.kind,
      slot: channelPosts.slot,
      status: channelPosts.status,
      html: channelPosts.html,
      messageId: channelPosts.messageId,
      createdAt: channelPosts.createdAt,
    })
    .from(channelPosts)
    .where(inArray(channelPosts.status, [...OPEN_APPROVAL_STATUSES]))
    .orderBy(desc(channelPosts.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));
  return rows;
}

/** The edit an operator is in the middle of, for one admin chat (their own). */
export async function editingPostFor(chatId: string): Promise<PendingApproval | null> {
  const rows = await db
    .select({
      postId: channelPosts.id,
      planId: channelPosts.planId,
      kind: channelPosts.kind,
      slot: channelPosts.slot,
      status: channelPosts.status,
      html: channelPosts.html,
      messageId: channelPosts.messageId,
      createdAt: channelPosts.createdAt,
    })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, APPROVAL_STATUS.editing), eq(channelPosts.chatId, chatId)))
    .orderBy(desc(channelPosts.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Retire posts nobody answered in time.
 *
 * Called from the cron tick and from the admin panel's approvals list, so a
 * stale preview cannot be approved hours later and publish yesterday's news.
 * Returns how many rows were retired.
 */
export async function expireStaleApprovals(now: Date = new Date(), env: Record<string, string | undefined> = process.env): Promise<number> {
  const cutoff = new Date(now.getTime() - approvalTtlHours(env) * 60 * 60_000);
  const rows = await db
    .update(channelPosts)
    .set({ status: APPROVAL_STATUS.expired, updatedAt: now })
    .where(and(inArray(channelPosts.status, [...OPEN_APPROVAL_STATUSES]), lt(channelPosts.createdAt, cutoff)))
    .returning({ id: channelPosts.id });
  return rows.length;
}
