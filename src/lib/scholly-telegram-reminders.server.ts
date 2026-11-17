import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions, schollyEvents, schollyProfiles, telegramLinks } from "@/db/schema";
import {
  parseSchollyReminderPreferences,
  schollyReminderLocalTime,
  shouldRemindAboutMission,
  type SchollyReminderPreferences,
} from "@/lib/scholly-reminders";
import { formatNotification, pickLang, shouldDeliver, type BotLang } from "@/lib/telegram/core";
import { ensureTelegramTables } from "@/lib/telegram/db";
import { publicSiteUrl, sendToChat, siteButton } from "@/lib/telegram/messaging";
import { getBotToken, getTelegramSettings } from "@/lib/telegram/settings";
import { claimSchollyMissionReminder, markSchollyReminderDelivery, SCHOLLY_MISSION_REMINDER } from "@/lib/scholly-notification-log.server";

const TYPE = SCHOLLY_MISSION_REMINDER;
const CLAIM_EVENT = "mission_telegram_claim";
const PAGE_SIZE = 200;

export const schollyMissionReminderCopy = {
  uz: {
    title: "Scholly · Bugungi missiya",
    friendly: "Bugungi kichik vazifang dashboardda kutyapti. Birga boshlaymizmi?",
    short: "Bugungi missiyani dashboarddan och.",
    serious: "Bugungi vazifani dashboarddan ochib, yakunlang.",
    open: "Missiyani ochish",
    settings: "Eslatmalarni o‘chirish",
  },
  ru: {
    title: "Scholly · Задание на сегодня",
    friendly: "Твоё короткое задание уже на главной. Начнём?",
    short: "Открой задание дня на главной.",
    serious: "Откройте и выполните сегодняшнее задание на главной.",
    open: "Открыть задание",
    settings: "Отключить напоминания",
  },
  en: {
    title: "Scholly · Today’s mission",
    friendly: "Your quick mission is ready on the dashboard. Ready to start?",
    short: "Open today’s mission on your dashboard.",
    serious: "Open your dashboard to complete today’s mission.",
    open: "Open mission",
    settings: "Turn off reminders",
  },
} satisfies Record<BotLang, Record<SchollyReminderPreferences["tone"] | "title" | "open" | "settings", string>>;

export async function runSchollyTelegramReminders(now?: Date, pausedPushUsers: ReadonlySet<number> = new Set()) {
  const summary = { candidates: 0, sent: 0, failed: 0 };

  const [{ token }, settings] = await Promise.all([getBotToken(), getTelegramSettings()]);
  if (!token || !settings.notificationsEnabled || !(await ensureTelegramTables())) return summary;
  const site = publicSiteUrl(settings);
  if (!siteButton(site, "en", "#notifications").length) {
    // Every reminder needs a working settings link.
    return summary;
  }

  for (let cursor = 0; ; ) {
    const candidates = await db.select({
      id: schollyProfiles.userId,
      tz: schollyProfiles.tz,
      quietStart: schollyProfiles.quietStart,
      quietEnd: schollyProfiles.quietEnd,
      reminderWindow: schollyProfiles.reminderWindow,
      notifPrefs: schollyProfiles.notifPrefs,
    })
      .from(schollyProfiles)
      .innerJoin(telegramLinks, eq(telegramLinks.profileId, schollyProfiles.userId))
      .where(and(
        gt(schollyProfiles.userId, cursor),
        eq(telegramLinks.blocked, false),
        eq(telegramLinks.notifyEnabled, true),
        sql`${schollyProfiles.notifPrefs}->'missionTelegram' = 'true'::jsonb`,
      ))
      .orderBy(asc(schollyProfiles.userId)).limit(PAGE_SIZE);
    if (!candidates.length) break;

    for (const candidate of candidates) {
      if (pausedPushUsers.has(candidate.id)) continue;
      const local = schollyReminderLocalTime(now ?? new Date(), candidate.tz);
      if (!local || !shouldRemindAboutMission(parseSchollyReminderPreferences(candidate), local.time)) continue;
      const { id } = candidate;
      summary.candidates++;
      let deliveryId: string | null = null;
      try {
        const reminder = await db.transaction(async (tx) => {
          // Lock the per-user row through the check and claim. Claims survive a
          // crash or an uncertain Telegram response, so overlapping jobs or a
          // retry after an accepted network request cannot send twice in a day.
          const [profile] = await tx.select().from(schollyProfiles)
            .where(eq(schollyProfiles.userId, id)).for("update").limit(1);
          if (!profile) return null;
          const clock = now ?? new Date();
          const local = schollyReminderLocalTime(clock, profile.tz);
          const prefs = parseSchollyReminderPreferences(profile);
          if (!local || !shouldRemindAboutMission(prefs, local.time)) return null;

          const [link] = await tx.select().from(telegramLinks)
            .where(eq(telegramLinks.profileId, id)).limit(1);
          if (!link || !shouldDeliver({ settings, link, type: TYPE, hasToken: true })) return null;

          const [mission] = await tx.select({ status: dailyMissions.status }).from(dailyMissions)
            .where(and(eq(dailyMissions.userId, id), eq(dailyMissions.day, local.day))).limit(1);
          if (mission && mission.status !== "pending") return null;

          const deliveryId = await claimSchollyMissionReminder(tx, id, local.day, "telegram", clock);
          if (!deliveryId) return null;

          await tx.insert(schollyEvents).values({
            userId: id, type: CLAIM_EVENT, payload: { day: local.day },
          });
          return { deliveryId, link, lang: pickLang(profile.lang), tone: prefs.tone };
        });
        if (!reminder) continue;

        deliveryId = reminder.deliveryId;
        const { link, lang, tone } = reminder;
        const text = schollyMissionReminderCopy[lang];
        const result = await sendToChat(
          token,
          link.chatId,
          formatNotification(lang, { title: text.title, body: text[tone] }),
          // No delayed retry that could arrive outside the allowed hour.
          { profileId: id, kind: "notification", type: TYPE, preview: text.title, singleAttempt: true },
          [...siteButton(site, lang, "#dashboard", text.open), ...siteButton(site, lang, "#notifications", text.settings)],
        );
        await markSchollyReminderDelivery(deliveryId, result.ok, now ?? new Date());
        if (result.ok) summary.sent++;
        else summary.failed++;
      } catch (error) {
        if (deliveryId) await markSchollyReminderDelivery(deliveryId, false, now ?? new Date()).catch(() => {});
        summary.failed++;
        console.warn("[scholly reminders] candidate failed:", error instanceof Error ? error.message : error);
      }
    }
    if (candidates.length < PAGE_SIZE) break;
    cursor = candidates[candidates.length - 1].id;
  }

  return summary;
}
