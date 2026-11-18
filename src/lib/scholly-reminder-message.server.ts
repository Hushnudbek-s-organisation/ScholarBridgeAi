import { createHash } from "node:crypto";
import { and, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { db } from "@/db";
import { dailyMissions, schollyFriendLinks } from "@/db/schema";
import { loadSchollyStreakEvidence } from "@/lib/scholly-streak.server";
import { computeSchollyStreak } from "@/lib/streak";
import type { BotLang } from "@/lib/telegram/core";

type Reader = Pick<typeof db, "select">;
export type SchollyReminderMessage = {
  category: "mission" | "streak" | "friend";
  variant: "A" | "B" | null;
};

export async function getSchollyReminderMessage(
  reader: Reader, id: number, now: Date, day: string, zone: string, channel: "push" | "telegram", tone: "friendly" | "short" | "serious",
): Promise<SchollyReminderMessage> {
  const { activityDays, missions } = await loadSchollyStreakEvidence(
    id, now, zone, 4, reader, new Date(now.getTime() - 5 * 86_400_000),
  );
  const streak = computeSchollyStreak(activityDays, missions, day, now);
  if (!streak.activeToday) {
    const links = schollyFriendLinks;
    const [pair] = await reader.select().from(links).where(and(
      isNull(links.endedAt), isNotNull(links.acceptedAt), isNotNull(links.friendId),
      or(eq(links.inviterId, id), eq(links.friendId, id)),
    )).limit(1);
    if (pair?.friendId && pair.acceptedAt) {
      const friendId = pair.inviterId === id ? pair.friendId : pair.inviterId;
      const [completion] = await reader.select({ doneAt: dailyMissions.doneAt }).from(dailyMissions).where(and(
        eq(dailyMissions.userId, friendId), eq(dailyMissions.day, day),
        eq(dailyMissions.status, "done"), lte(dailyMissions.doneAt, now),
      )).limit(1);
      if (completion?.doneAt && completion.doneAt >= pair.acceptedAt) return { category: "friend", variant: null };
    }
    if (streak.current >= 3) return { category: "streak", variant: null };
  }
  const assignment = createHash("sha256").update(`scholly-mission-push-v1:${id}`).digest()[0];
  return { category: "mission", variant: channel === "push" && tone === "friendly" ? (assignment < 128 ? "A" : "B") : null };
}

const copy = {
  uz: {
    friend: "Do‘sting bugungi missiyasini bajardi. Vaqting bo‘lsa, sen ham o‘z vazifangni och.",
    streak: "Bugungi missiyani yakunlab, ketma-ket faolligingni davom ettirishing mumkin.",
    B: "Bugun o‘qish rejang bo‘yicha bitta kichik qadam tashla. Missiyang dashboardda.",
  },
  en: {
    friend: "Your streak partner finished today’s mission. Open yours when you have time.",
    streak: "You can keep your streak going by finishing today’s mission.",
    B: "Take one small step on your study plan today. Your mission is on the dashboard.",
  },
  ru: {
    friend: "Друг уже выполнил задание дня. Откройте своё, когда будет удобно.",
    streak: "Выполните сегодняшнее задание, чтобы продолжить серию.",
    B: "Сделайте один небольшой шаг по учебному плану. Задание ждёт на главной.",
  },
} satisfies Record<BotLang, Record<"friend" | "streak" | "B", string>>;

export function schollyReminderBody(lang: BotLang, message: SchollyReminderMessage, standard: string) {
  if (message.category !== "mission") return copy[lang][message.category];
  return message.variant === "B" ? copy[lang].B : standard;
}
