import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumLikes, forumThreads, forumReplies } from "@/db/schema";
import { eq, and, count, ne } from "drizzle-orm";
import { postgresId } from "@/lib/pagination";
import { awardSchollyPoints } from "@/lib/scholly-points.server";
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

/** Toggle a like. An authenticated peer's first helpful mark can credit a reply. */
export async function POST(req: Request) {
  try {
    // Size-capped parse: even an authenticated community write must never
    // hand an unbounded body to the JSON parser.
    const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const { userId: claimedUser, targetType } = parsed.body;
    const userId = postgresId(claimedUser);
    const targetId = postgresId(parsed.body.targetId);

    if (!userId || !targetId || (targetType !== "thread" && targetType !== "reply")) {
      return NextResponse.json({ error: "Valid userId, targetId and targetType are required" }, { status: 400 });
    }

    // Liking is a write attributed to a user — it must be the caller.
    const access = await requireProfileAccess(req, userId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (access.session.profile.id !== userId) {
      return NextResponse.json({ error: "You can only mark posts for your own account.", code: "forbidden" }, { status: 403 });
    }
    const locked = await premiumGate(access.session.profile.id, "forum_write");
    if (locked) return locked;
    const writeLimit = checkRateLimit(`forum:${access.session.profile.id}`, LIMITS.forumWrite);
    if (!writeLimit.ok) return rateLimitedResponse(writeLimit.retryAfterSec);

    const result = await db.transaction(async (tx) => {
      // Lock the target for a consistent toggle and first-mark decision, even
      // when different people mark the same reply concurrently.
      const target = targetType === "reply" ? forumReplies : forumThreads;
      const [post] = await tx.select({ authorId: target.authorId }).from(target)
        .where(eq(target.id, targetId)).for("no key update").limit(1);
      if (!post) return null;

      const targetMarks = and(eq(forumLikes.targetType, targetType), eq(forumLikes.targetId, targetId));
      const myMark = and(targetMarks, eq(forumLikes.userId, userId));
      const [existing] = await tx.select({ id: forumLikes.id }).from(forumLikes).where(myMark).limit(1);
      if (existing) {
        await tx.delete(forumLikes).where(myMark);
        return { liked: false };
      }

      const eligible = targetType === "reply" && post.authorId !== userId;
      const previousMarks = eligible ? await tx.select({ id: forumLikes.id }).from(forumLikes)
        .where(and(targetMarks, ne(forumLikes.userId, post.authorId))).limit(1) : [];
      await tx.insert(forumLikes).values({ userId, targetType, targetId });
      if (eligible && previousMarks.length === 0) {
        await awardSchollyPoints(post.authorId, "forum_helpful", `helpful_reply:${post.authorId}:${targetId}`, tx, {
          relatedEntityId: targetId,
        });
      }
      return { liked: true };
    });
    if (!result) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/forum/likes error:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
