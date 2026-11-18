import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyFriendLinks, studentProfiles } from "@/db/schema";
import { schollyDayKey } from "@/lib/scholly-missions";
import { awardSchollyPoints } from "@/lib/scholly-points.server";
import { loadSchollyStreakEvidence } from "@/lib/scholly-streak.server";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const links = schollyFriendLinks;
const members = (id: number) => or(eq(links.inviterId, id), eq(links.friendId, id));
const active = (id: number) => and(members(id), isNull(links.endedAt), isNotNull(links.acceptedAt));
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function sharedSchollyStreak(first: readonly string[], second: readonly string[], start: string) {
  const other = new Set(second);
  let run = 0;
  let longest = 0;
  let previous = NaN;
  for (const day of [...new Set(first)].sort()) {
    if (day < start || !other.has(day)) continue;
    const instant = Date.parse(day + "T00:00:00Z");
    run = instant - previous === 86_400_000 ? run + 1 : 1;
    previous = instant;
    longest = Math.max(longest, run);
  }
  return longest;
}

async function evidence(tx: Tx, pair: typeof links.$inferSelect) {
  const now = new Date();
  const first = await loadSchollyStreakEvidence(pair.inviterId, now, undefined, 4, tx);
  const second = await loadSchollyStreakEvidence(pair.friendId!, now, undefined, 4, tx);
  const firstStart = schollyDayKey(pair.acceptedAt!, first.timeZone);
  const secondStart = schollyDayKey(pair.acceptedAt!, second.timeZone);
  // Count only full Scholly days after both members accepted.
  const start = new Date(Date.parse((firstStart > secondStart ? firstStart : secondStart) + "T00:00:00Z") + 86_400_000)
    .toISOString().slice(0, 10);
  return sharedSchollyStreak(first.activityDays, second.activityDays, start);
}

export async function getSchollyFriendState(id: number) {
  return db.transaction(async tx => {
    const [pair] = await tx.select().from(links).where(active(id)).limit(1);
    if (!pair) return { paired: false, together: 0 };
    return { paired: true, together: await evidence(tx, pair) };
  }, { accessMode: "read only" });
}

export async function changeSchollyFriend(id: number, action: "invite" | "accept" | "leave", token?: string) {
  return db.transaction(async tx => {
    // All pairing changes take the same lock so crossed invites cannot create two active pairs.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(182117, 1)`);
    const now = new Date();
    if (action === "leave") {
      await tx.update(links).set({ endedAt: now }).where(and(members(id), isNull(links.endedAt)));
      return { paired: false };
    }
    const [existing] = await tx.select({ id: links.id }).from(links).where(active(id)).limit(1);
    if (existing) return null;
    if (action === "invite") {
      const code = randomBytes(24).toString("base64url");
      await tx.update(links).set({ endedAt: now }).where(and(eq(links.inviterId, id), isNull(links.endedAt)));
      await tx.insert(links).values({ inviterId: id, tokenHash: hash(code), expiresAt: new Date(now.getTime() + 7 * 86_400_000) });
      return { paired: false, code };
    }
    if (!token || !/^[\w-]{32}$/.test(token)) return null;
    const [invite] = await tx.select().from(links).where(eq(links.tokenHash, hash(token))).limit(1);
    if (!invite || invite.inviterId === id || invite.endedAt || invite.acceptedAt || invite.expiresAt <= now) return null;
    const [used] = await tx.select({ id: links.id }).from(links).where(active(invite.inviterId)).limit(1);
    if (used) return null;
    await tx.update(links).set({ friendId: id, acceptedAt: now }).where(eq(links.id, invite.id));
    return { paired: true };
  });
}

export async function awardSchollyFriendStreak(id: number) {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(182117, 1)`);
    const [pair] = await tx.select().from(links).where(active(id)).limit(1);
    if (!pair || pair.friendId === null) return;
    const low = Math.min(pair.inviterId, pair.friendId);
    const high = Math.max(pair.inviterId, pair.friendId);
    await tx.select({ id: studentProfiles.id }).from(studentProfiles)
      .where(or(eq(studentProfiles.id, low), eq(studentProfiles.id, high)))
      .orderBy(asc(studentProfiles.id)).for("no key update");
    if (await evidence(tx, pair) < 7) return;
    const key = `friend-streak:${low}:${high}`;
    await awardSchollyPoints(low, "friend_streak", key, tx, { relatedEntityId: pair.id });
    await awardSchollyPoints(high, "friend_streak", key, tx, { relatedEntityId: pair.id });
  });
}
