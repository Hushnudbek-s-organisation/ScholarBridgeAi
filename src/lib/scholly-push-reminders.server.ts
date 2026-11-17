import { getSchollyReminderMessage, schollyReminderBody } from "@/lib/scholly-reminder-message.server";
import { and, asc, desc, eq, exists, gt, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions, schollyNotificationLog, schollyProfiles, schollyPushSubscriptions } from "@/db/schema";
import { claimSchollyMissionReminder, markSchollyReminderDelivery, SCHOLLY_MISSION_REMINDER } from "@/lib/scholly-notification-log.server";
import { parseSchollyReminderPreferences, schollyMissionPushTtl, schollyReminderLocalTime } from "@/lib/scholly-reminders";
import { getSchollyVapidConfig, sendSchollyWebPush } from "@/lib/scholly-push.server";
import { schollyMissionReminderCopy } from "@/lib/scholly-telegram-reminders.server";
import { pickLang } from "@/lib/telegram/core";

const PAGE_SIZE = 200;
const PAUSE_MS = 3 * 86_400_000;

export async function schollyPushPauseUntil(profileId: number, now: Date, reader: Pick<typeof db, "select"> = db) {
  const history = await reader.select({
    sentAt: schollyNotificationLog.sentAt, openedAt: schollyNotificationLog.openedAt,
  }).from(schollyNotificationLog).where(and(
    eq(schollyNotificationLog.userId, profileId), eq(schollyNotificationLog.channel, "push"),
    eq(schollyNotificationLog.type, SCHOLLY_MISSION_REMINDER), eq(schollyNotificationLog.status, "sent"),
    isNotNull(schollyNotificationLog.sentAt),
  )).orderBy(desc(schollyNotificationLog.sentAt)).limit(3);
  if (history.length < 3 || history.some(row => row.openedAt) || !history[0]?.sentAt) return null;
  const resumeAt = new Date(history[0].sentAt.getTime() + PAUSE_MS);
  return resumeAt > now ? resumeAt : null;
}

export async function runSchollyPushReminders(now?: Date, request: typeof fetch = fetch) {
  const summary = { candidates: 0, sent: 0, failed: 0, pausedUsers: new Set<number>() };
  const config = getSchollyVapidConfig();
  if (!config) return summary;

  for (let cursor = 0; ; ) {
    const candidates = await db.select().from(schollyProfiles).where(and(
      gt(schollyProfiles.userId, cursor),
      exists(db.select({ user: schollyPushSubscriptions.userId }).from(schollyPushSubscriptions)
        .where(eq(schollyPushSubscriptions.userId, schollyProfiles.userId))),
    )).orderBy(asc(schollyProfiles.userId)).limit(PAGE_SIZE);
    if (!candidates.length) break;

    for (const candidate of candidates) {
      const clock = now ?? new Date();
      const local = schollyReminderLocalTime(clock, candidate.tz);
      if (!local || schollyMissionPushTtl(parseSchollyReminderPreferences(candidate), clock, local.time) <= 0) continue;
      const id = candidate.userId;
      summary.candidates++;
      let deliveryId: string | null = null;
      try {
        const reminder = await db.transaction(async tx => {
          const [profile] = await tx.select().from(schollyProfiles)
            .where(eq(schollyProfiles.userId, id)).for("update").limit(1);
          if (!profile) return null;
          const instant = now ?? new Date();
          const local = schollyReminderLocalTime(instant, profile.tz);
          const prefs = parseSchollyReminderPreferences(profile);
          if (!local) return null;
          const ttl = schollyMissionPushTtl(prefs, instant, local.time);
          if (ttl <= 0) return null;

          const [subscription] = await tx.select().from(schollyPushSubscriptions)
            .where(eq(schollyPushSubscriptions.userId, id))
            .orderBy(desc(schollyPushSubscriptions.updatedAt), asc(schollyPushSubscriptions.endpointHash)).limit(1);
          if (!subscription) return null;
          if (await schollyPushPauseUntil(id, instant, tx)) {
            summary.pausedUsers.add(id);
            return null;
          }
          const [mission] = await tx.select({ status: dailyMissions.status }).from(dailyMissions)
            .where(and(eq(dailyMissions.userId, id), eq(dailyMissions.day, local.day))).limit(1);
          if (mission && mission.status !== "pending") return null;

          const message = await getSchollyReminderMessage(tx, id, instant, local.day, profile.tz, "push", prefs.tone);
          const deliveryId = await claimSchollyMissionReminder(tx, id, local.day, "push", instant, message);
          return deliveryId ? { deliveryId, subscription, ttl, message, lang: pickLang(profile.lang), tone: prefs.tone } : null;
        });
        if (!reminder) continue;
        deliveryId = reminder.deliveryId;
        const { subscription, lang, tone, message } = reminder;
        const [stillEnrolled] = await db.select({ id: schollyPushSubscriptions.endpointHash }).from(schollyPushSubscriptions)
          .where(and(eq(schollyPushSubscriptions.endpointHash, subscription.endpointHash), eq(schollyPushSubscriptions.userId, id))).limit(1);
        const text = schollyMissionReminderCopy[lang];
        const result = stillEnrolled ? await sendSchollyWebPush({
          endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh },
        }, { title: text.title, body: schollyReminderBody(lang, message, text[tone]), settingsLabel: text.settings, deliveryId }, config, reminder.ttl, request)
          : { sent: false, expired: false };
        await markSchollyReminderDelivery(deliveryId, result.sent, now ?? new Date());
        if (result.expired) await db.delete(schollyPushSubscriptions).where(and(
          eq(schollyPushSubscriptions.endpointHash, subscription.endpointHash), eq(schollyPushSubscriptions.userId, id),
          eq(schollyPushSubscriptions.auth, subscription.auth), eq(schollyPushSubscriptions.p256dh, subscription.p256dh),
        ));
        if (result.sent) summary.sent++;
        else summary.failed++;
      } catch (error) {
        if (deliveryId) await markSchollyReminderDelivery(deliveryId, false, now ?? new Date()).catch(() => {});
        summary.failed++;
        // Subscription endpoint URLs and key values are private capabilities.
        console.warn("[Scholly push] delivery failed:", (error as Error)?.name);
      }
    }
    if (candidates.length < PAGE_SIZE) break;
    cursor = candidates[candidates.length - 1].userId;
  }
  return summary;
}
