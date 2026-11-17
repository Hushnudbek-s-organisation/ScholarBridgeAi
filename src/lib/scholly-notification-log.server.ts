import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyEvents, schollyNotificationLog } from "@/db/schema";

export const SCHOLLY_MISSION_REMINDER = "scholly_daily_mission";

/** Caller holds the user's Scholly profile row lock. The unique key also
 * serializes claims across channels and overlapping scheduler invocations. */
export async function claimSchollyMissionReminder(
  tx: Pick<typeof db, "select" | "insert">,
  userId: number,
  localDay: string,
  channel: "telegram" | "push",
  now: Date,
) {
  const [legacyClaim] = await tx.select({ id: schollyEvents.id }).from(schollyEvents).where(and(
    eq(schollyEvents.userId, userId), eq(schollyEvents.type, "mission_telegram_claim"),
    sql`${schollyEvents.payload}->>'day' = ${localDay}`,
  )).limit(1);
  if (legacyClaim) return null;
  const [claim] = await tx.insert(schollyNotificationLog).values({
    id: randomUUID(), userId, type: SCHOLLY_MISSION_REMINDER, localDay, channel, status: "claimed", createdAt: now,
  }).onConflictDoNothing({
    target: [schollyNotificationLog.userId, schollyNotificationLog.localDay, schollyNotificationLog.type],
  }).returning({ id: schollyNotificationLog.id });
  return claim?.id ?? null;
}

export async function markSchollyReminderDelivery(id: string, delivered: boolean, now: Date) {
  await db.update(schollyNotificationLog).set({ status: delivered ? "sent" : "failed", sentAt: delivered ? now : null })
    .where(eq(schollyNotificationLog.id, id));
}
