import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumLikes, forumThreads, forumReplies } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { requireProfileAccess } from "@/lib/auth";
import { requireFeatureSession, premiumGate } from "@/lib/premium";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

export async function GET(req: Request) {
  try {
    // Reading the forum is free; writing is gated by forum_write (Pro).
    const member = await requireFeatureSession(req, "forum");
    if (!member.ok) return member.response;
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetIdStr = searchParams.get("targetId");
    const userIdStr = searchParams.get("userId");

    if (!targetType || !targetIdStr) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }
    const targetId = parseInt(targetIdStr, 10);

    const [countRow] = await db
      .select({ c: count(forumLikes.id) })
      .from(forumLikes)
      .where(and(eq(forumLikes.targetType, targetType), eq(forumLikes.targetId, targetId)));
    const likeCount = countRow?.c ?? 0;

    let likedByMe = false;
    if (userIdStr) {
      const mine = await db
        .select()
        .from(forumLikes)
        .where(
          and(
            eq(forumLikes.userId, parseInt(userIdStr, 10)),
            eq(forumLikes.targetType, targetType),
            eq(forumLikes.targetId, targetId)
          )
        );
      likedByMe = mine.length > 0;
    }

    return NextResponse.json({ likeCount, likedByMe });
  } catch (error) {
    console.error("GET /api/forum/likes error:", error);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}

/** Toggle a like. One like per user per target enforced via unique index. */
export async function POST(req: Request) {
  try {
    // Size-capped parse: even an authenticated community write must never
    // hand an unbounded body to the JSON parser.
    const parsed = await readJsonBody<Record<string, any>>(req, 16 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;
    const { userId, targetType, targetId } = body;

    if (!userId || !targetType || !targetId) {
      return NextResponse.json({ error: "userId, targetType and targetId are required" }, { status: 400 });
    }

    // Liking is a write attributed to a user — it must be the caller.
    const access = await requireProfileAccess(req, userId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const locked = await premiumGate(access.session.profile.id, "forum_write");
    if (locked) return locked;
    const writeLimit = checkRateLimit(`forum:${access.session.profile.id}`, LIMITS.forumWrite);
    if (!writeLimit.ok) return rateLimitedResponse(writeLimit.retryAfterSec);

    const existing = await db
      .select()
      .from(forumLikes)
      .where(
        and(
          eq(forumLikes.userId, Number(userId)),
          eq(forumLikes.targetType, targetType),
          eq(forumLikes.targetId, Number(targetId))
        )
      );

    if (existing.length > 0) {
      await db.delete(forumLikes).where(eq(forumLikes.id, existing[0].id));
      return NextResponse.json({ liked: false });
    }

    await db.insert(forumLikes).values({
      userId: Number(userId),
      targetType,
      targetId: Number(targetId),
    });

    // Reward the author of the liked content (once per like target).
    try {
      let authorId: number | null = null;
      if (targetType === "thread") {
        const [t] = await db.select().from(forumThreads).where(eq(forumThreads.id, Number(targetId)));
        authorId = t?.authorId ?? null;
      } else if (targetType === "reply") {
        const [r] = await db.select().from(forumReplies).where(eq(forumReplies.id, Number(targetId)));
        authorId = r?.authorId ?? null;
      }
      if (authorId && authorId !== Number(userId)) {
        await awardPoints(authorId, 1, "content_liked", Number(targetId));
      }
    } catch (err) {
      console.error("Failed to award like points:", err);
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error("POST /api/forum/likes error:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
