/**
 * Notification sweep + event notifications (shared by the API route, the
 * cron endpoint, the in-process scheduler and admin actions).
 *
 *  - runNotificationSweep(profileId)   deadlines / milestones / matches / gaps / essay
 *  - runSweepForLinkedUsers()          the same for every Telegram-linked account,
 *                                      so reminders arrive even if the student
 *                                      never opens the site
 *  - notifyScholarshipDeadlineChanged  admin moved a deadline → everyone who saved it
 *  - notifyScholarshipOpened           status became "open" → everyone who saved it
 *
 * Every notification is idempotent on (profile, type, link), so running the
 * sweep often never duplicates anything.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appConfig,
  applicationTasks,
  essayVersions,
  notifications,
  savedScholarships,
  savedUniversities,
  scholarships,
  studentProfiles,
  universities,
} from "@/db/schema";
import { calculateScholarshipMatch } from "@/lib/matching";
import { toMatchProfileWithActivities } from "@/lib/profileMapping";
import { createNotification, profileLang } from "@/lib/notifications";
import { NOTIFY_TEXTS, type NotifyLang } from "@/lib/notificationTexts";
import { calendarDaysUntil, parseReminderDays, reminderBucket, reminderTimezone } from "@/lib/telegram/reminders";

async function exists(profileId: number, type: string, link: string): Promise<boolean> {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.profileId, profileId),
        inArray(notifications.type, [type, `muted:${type}`]),
        eq(notifications.link, link)
      )
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Create a notification once per (profile, type, link). The notifications
 * row is the idempotency record. When the user switched the in-app type off,
 * createNotification skips the insert (Telegram may still have been sent), so
 * a hidden `muted:<type>` marker is stored instead — GET /api/notifications
 * never returns those — and the next sweep does not repeat the message.
 */
async function notifyOnce(profileId: number, type: string, link: string, title: string, body: string): Promise<boolean> {
  if (await exists(profileId, type, link)) return false;
  const row = await createNotification({ profileId, type, title, body, link });
  if (!row) {
    await db
      .insert(notifications)
      .values({ profileId, type: `muted:${type}`, title, body, link, isRead: true })
      .catch(() => undefined);
  }
  return true;
}

/** The profile's reminder offsets (Telegram settings) — defaults when not connected. */
async function reminderDaysFor(profileId: number): Promise<number[]> {
  try {
    const res = await db.execute(sql`SELECT reminder_days FROM telegram_links WHERE profile_id = ${profileId} LIMIT 1`);
    const row = ((res as unknown as { rows?: { reminder_days: string | null }[] }).rows ?? [])[0];
    return parseReminderDays(row?.reminder_days ?? null);
  } catch {
    return parseReminderDays(null); // telegram tables not created yet
  }
}

/** Advisory-lock namespace for reminder sweeps (any constant int4). */
const SWEEP_LOCK_NS = 740_221;

/**
 * Run `fn` only if no other instance/request is sweeping the same key right
 * now. The lock is transaction-scoped on one pooled connection, so it is
 * released automatically — even if the process dies mid-sweep. `null` means
 * someone else holds it (skip; their run covers it).
 */
async function withSweepLock<T>(key: number, fn: () => Promise<T>): Promise<T | null> {
  return db.transaction(async (tx) => {
    const res = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${SWEEP_LOCK_NS}, ${key}) AS ok`);
    const ok = ((res as unknown as { rows?: { ok: boolean }[] }).rows ?? [])[0]?.ok === true;
    if (!ok) return null;
    return fn();
  });
}

/**
 * Create the due reminders for one profile. Serialised per profile (the
 * scheduler, the cron endpoint and the website's on-open sweep may overlap),
 * so the "already sent?" check and the insert cannot interleave.
 */
export async function runNotificationSweep(profileId: number, windowDays = 14, now: Date = new Date()): Promise<number> {
  const out = await withSweepLock(profileId, () => sweepProfile(profileId, windowDays, now));
  return out ?? 0;
}

async function sweepProfile(profileId: number, _windowDays: number, now: Date): Promise<number> {
  const tz = reminderTimezone();
  const offsets = await reminderDaysFor(profileId);
  const lang: NotifyLang = await profileLang(profileId);
  let created = 0;

  // ---------- 1) Saved scholarships with upcoming deadlines ----------
  // One reminder per (scholarship, due date, offset bucket): see
  // telegram/reminders. Unsaved scholarships are simply not in this list, and
  // a moved deadline produces fresh keys — stale dates are never re-sent.
  const saved = await db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId));
  const savedIds = saved.map((s) => s.scholarshipId);
  const savedRows = savedIds.length ? await db.select().from(scholarships).where(inArray(scholarships.id, savedIds)) : [];
  for (const sch of savedRows) {
    if (!sch.deadlineDate) continue;
    const due = String(sch.deadlineDate).slice(0, 10);
    const daysLeft = calendarDaysUntil(due, now, tz);
    if (daysLeft === null) continue;
    const bucket = reminderBucket(daysLeft, offsets);
    if (bucket === null) continue;
    const t = NOTIFY_TEXTS.deadlineApproaching(lang, { title: sch.title, daysLeft, date: due });
    if (await notifyOnce(profileId, "deadline_approaching", `/scholarships?id=${sch.id}&due=${due}&r=${bucket}`, t.title, t.body)) created++;
  }

  // ---------- 2) User milestones due soon ----------
  // Completed tasks are filtered out, so ticking a task stops its reminders.
  const tasks = await db
    .select()
    .from(applicationTasks)
    .where(and(eq(applicationTasks.profileId, profileId), eq(applicationTasks.isCompleted, false)));
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const due = String(task.dueDate).slice(0, 10);
    const daysLeft = calendarDaysUntil(due, now, tz);
    if (daysLeft === null) continue;
    const bucket = reminderBucket(daysLeft, offsets);
    if (bucket === null) continue;
    const t = NOTIFY_TEXTS.milestoneDue(lang, { title: task.title, daysLeft, date: due });
    if (await notifyOnce(profileId, "milestone_due", `/tasks?task=${task.id}&due=${due}&r=${bucket}`, t.title, t.body)) created++;
  }

  // ---------- 3) Matching scholarships + requirement gaps ----------
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (profile) {
    const savedUnis = await db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId));
    const uniRows = savedUnis.length
      ? await db.select().from(universities).where(inArray(universities.id, savedUnis.map((s) => s.universityId)))
      : [];
    const countries = [...new Set(uniRows.map((u) => u.country))];
    const matchProfile = await toMatchProfileWithActivities(profile);
    const savedSet = new Set(savedIds);

    if (countries.length > 0) {
      const candidates = await db.select().from(scholarships).where(inArray(scholarships.country, countries));
      let notified = 0;
      for (const sch of candidates) {
        if (notified >= 3) break; // never spam in one sweep
        if (savedSet.has(sch.id)) continue;
        const match = calculateScholarshipMatch(matchProfile, sch);
        if (match.matchScore == null || match.matchScore < 60) continue;
        const t = NOTIFY_TEXTS.newMatch(lang, { title: sch.title, country: sch.country, score: match.matchScore });
        if (await notifyOnce(profileId, "scholarship_opened", `/scholarships?id=${sch.id}`, t.title, t.body)) {
          created++;
          notified++;
        }
      }
    }

    const withMinIelts = uniRows.filter((u) => u.minIelts != null);
    if (withMinIelts.length > 0) {
      const score = profile.ieltsScore == null ? null : Number(profile.ieltsScore);
      const missing = score == null ? withMinIelts.length : withMinIelts.filter((u) => score < Number(u.minIelts)).length;
      if (missing > 0) {
        const highest = Math.max(...withMinIelts.map((u) => Number(u.minIelts)));
        const t = NOTIFY_TEXTS.ieltsGap(lang, { score, missing, highest });
        if (await notifyOnce(profileId, "requirement_gap", "/profile?gap=ielts", t.title, t.body)) created++;
      }
    }
  }

  // ---------- 4) Essay improved between versions ----------
  const latestTwo = await db
    .select()
    .from(essayVersions)
    .where(eq(essayVersions.profileId, profileId))
    .orderBy(desc(essayVersions.id))
    .limit(2);
  if (latestTwo.length === 2) {
    const [latest, previous] = latestTwo;
    const prev = previous.rubricTotal != null ? Number(previous.rubricTotal) : null;
    const last = latest.rubricTotal != null ? Number(latest.rubricTotal) : null;
    if (prev != null && last != null && last >= prev + 5) {
      const t = NOTIFY_TEXTS.essayImproved(lang, { delta: last - prev, latestId: latest.id, last, prev, prevId: previous.id });
      if (await notifyOnce(profileId, "essay_improved", `/sop?version=${latest.id}`, t.title, t.body)) created++;
    }
  }

  return created;
}

export interface SweepSummary {
  profiles: number;
  created: number;
  errors: number;
  startedAt: string;
  finishedAt: string;
}

/**
 * Sweep every account that connected Telegram and still wants alerts.
 * (Accounts without Telegram get their sweep when they open the site.)
 */
export async function runSweepForLinkedUsers(opts: { limit?: number } = {}): Promise<SweepSummary> {
  const startedAt = new Date().toISOString();
  let ids: number[] = [];
  try {
    const res = await db.execute(
      sql`SELECT profile_id FROM telegram_links WHERE blocked = FALSE AND notify_enabled = TRUE ORDER BY last_message_at NULLS FIRST LIMIT ${opts.limit ?? 2000}`
    );
    ids = ((res as unknown as { rows?: { profile_id: number }[] }).rows ?? []).map((r) => Number(r.profile_id));
  } catch {
    ids = []; // telegram tables not created yet → nobody linked
  }
  let created = 0;
  let errors = 0;
  for (const id of ids) {
    try {
      created += await runNotificationSweep(id);
    } catch (err) {
      errors++;
      console.warn(`[sweep] profile ${id} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return { profiles: ids.length, created, errors, startedAt, finishedAt: new Date().toISOString() };
}

/**
 * Everything the scheduler / cron / admin "Run now" does in one go:
 * reminders for every linked account, bounded retries of failed Telegram
 * deliveries, and pruning of the webhook de-duplication table.
 */
export async function runScheduledTelegramJobs(): Promise<SweepSummary & { retried: number; retrySent: number; retryDropped: number; skipped?: boolean }> {
  const startedAt = new Date().toISOString();
  // One run at a time across all instances (key 0 is never a profile id).
  const result = await withSweepLock(0, () => scheduledJobs());
  return result ?? { profiles: 0, created: 0, errors: 0, startedAt, finishedAt: new Date().toISOString(), retried: 0, retrySent: 0, retryDropped: 0, skipped: true };
}

async function scheduledJobs() {
  const summary = await runSweepForLinkedUsers();
  let retry = { retried: 0, sent: 0, dropped: 0 };
  try {
    const { retryFailedDeliveries, pruneTelegramUpdates } = await import("@/lib/telegram/service");
    retry = await retryFailedDeliveries();
    await pruneTelegramUpdates();
  } catch (err) {
    console.warn("[sweep] telegram maintenance failed:", err instanceof Error ? err.message : err);
  }
  return { ...summary, retried: retry.retried, retrySent: retry.sent, retryDropped: retry.dropped, finishedAt: new Date().toISOString() };
}

async function saversOf(scholarshipId: number): Promise<number[]> {
  const rows = await db
    .select({ profileId: savedScholarships.profileId })
    .from(savedScholarships)
    .where(eq(savedScholarships.scholarshipId, scholarshipId));
  return [...new Set(rows.map((r) => r.profileId))];
}

const isoDay = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/** Admin changed a deadline → tell everyone who saved the scholarship. */
export async function notifyScholarshipDeadlineChanged(
  sch: { id: number; title: string },
  oldDate: Date | string | null | undefined,
  newDate: Date | string | null | undefined
): Promise<number> {
  const before = isoDay(oldDate);
  const after = isoDay(newDate);
  if (before === after || !after) return 0; // unchanged, or deadline removed
  let sent = 0;
  for (const profileId of await saversOf(sch.id)) {
    try {
      const lang = await profileLang(profileId);
      const t = NOTIFY_TEXTS.deadlineChanged(lang, { title: sch.title, oldDate: before, newDate: after });
      if (await notifyOnce(profileId, "deadline_changed", `/scholarships?id=${sch.id}&deadline=${after}`, t.title, t.body)) sent++;
    } catch (err) {
      console.warn("[notify] deadline_changed failed:", err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

/** Scholarship status became "open" → tell everyone who saved it. */
export async function notifyScholarshipOpened(sch: { id: number; title: string; deadlineDate?: Date | string | null }): Promise<number> {
  const cycle = isoDay(sch.deadlineDate) ?? "open";
  let sent = 0;
  for (const profileId of await saversOf(sch.id)) {
    try {
      const lang = await profileLang(profileId);
      const t = NOTIFY_TEXTS.scholarshipOpened(lang, { title: sch.title, deadline: sch.deadlineDate ?? null });
      if (await notifyOnce(profileId, "scholarship_opened", `/scholarships?id=${sch.id}&opened=${cycle}`, t.title, t.body)) sent++;
    } catch (err) {
      console.warn("[notify] scholarship_opened failed:", err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

// ---------------------------------------------------------------------------
// Last automatic run (shown in Admin → Telegram bot)
// ---------------------------------------------------------------------------

const LAST_SWEEP_KEY = "notification_last_sweep";

export type SweepSource = "scheduler" | "cron" | "admin";

export async function recordSweep(summary: SweepSummary, source: SweepSource): Promise<void> {
  const value = JSON.stringify({ ...summary, source });
  try {
    const [row] = await db.select({ key: appConfig.key }).from(appConfig).where(eq(appConfig.key, LAST_SWEEP_KEY)).limit(1);
    if (row) await db.update(appConfig).set({ value, updatedAt: new Date() }).where(eq(appConfig.key, LAST_SWEEP_KEY));
    else await db.insert(appConfig).values({ key: LAST_SWEEP_KEY, value, description: "Last scheduled reminder sweep (auto)" });
  } catch (err) {
    console.warn("[sweep] could not record the run:", err instanceof Error ? err.message : err);
  }
}

export async function lastSweep(): Promise<(SweepSummary & { source: SweepSource }) | null> {
  try {
    const [row] = await db.select({ value: appConfig.value }).from(appConfig).where(eq(appConfig.key, LAST_SWEEP_KEY)).limit(1);
    return row?.value ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
