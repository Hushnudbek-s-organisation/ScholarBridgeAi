import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { dailyMissions, schollyWardrobeItems } from "../db/schema";
import { logSchollyEvent } from "./scholly-events";
import { SCHOLLY_WARDROBE, schollySeason, wardrobeId } from "./scholly-wardrobe";

type WardrobeWriter = Pick<typeof db, "select" | "insert">;

/** The unique item key makes a seasonal award durable and safe to retry. */
export async function grantSeasonalSchollyWardrobe(profileId: number, day: string, tx: WardrobeWriter, owned = new Set<string>()) {
  for (const item of SCHOLLY_WARDROBE) {
    const unlock = item.unlock;
    const itemKey = wardrobeId(item);
    if (unlock.type !== "season" || owned.has(itemKey)) continue;
    const range = schollySeason(day, unlock);
    if (!range) continue;
    const [missions] = await tx.select({ count: sql<number>`count(*)::int` }).from(dailyMissions)
      .where(and(
        eq(dailyMissions.userId, profileId), eq(dailyMissions.status, "done"),
        gte(dailyMissions.day, range.start), lte(dailyMissions.day, day),
      ));
    if ((missions?.count ?? 0) < unlock.missions) continue;
    const [inserted] = await tx.insert(schollyWardrobeItems).values({ userId: profileId, itemKey, source: "achievement" })
      .onConflictDoNothing().returning({ itemKey: schollyWardrobeItems.itemKey });
    owned.add(itemKey);
    if (inserted) await logSchollyEvent(profileId, "item_unlocked", { itemKey, source: "achievement" }, tx);
  }
}

/** Run after the mission transaction so a wardrobe outage cannot undo completion. */
export async function checkSchollySeasonalRewards(profileId: number, day: string) {
  if (!SCHOLLY_WARDROBE.some(item => item.unlock.type === "season" && schollySeason(day, item.unlock))) return;
  try {
    await db.transaction(tx => grantSeasonalSchollyWardrobe(profileId, day, tx));
  } catch (error) {
    console.error("Scholly seasonal rewards are unavailable:", error);
  }
}
