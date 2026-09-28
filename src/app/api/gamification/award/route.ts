import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { completeReferralIfDue } from "@/lib/referrals";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";

const MAX_MANUAL_AWARD = 10_000;

/**
 * Manually award points — admin only. Students earn points from the server-side
 * events themselves (lesson/quiz completion, profile completion, referrals);
 * letting a student call this for their own profile meant any account could
 * give itself unlimited points and top the public leaderboard.
 */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const parsed = await readJsonBody<Record<string, unknown>>(req, 4 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const { profileId, reason, relatedEntityId } = parsed.body;
    const points = Number(parsed.body.points);

    if (!positiveInt(profileId) || !Number.isInteger(points) || points <= 0 || points > MAX_MANUAL_AWARD) {
      return NextResponse.json(
        { error: `profileId and a whole number of points from 1 to ${MAX_MANUAL_AWARD} are required` },
        { status: 400 }
      );
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, Number(profileId)));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const related = positiveInt(relatedEntityId);
    const award = await awardPoints(profile.id, points, clampString(reason, 60).trim() || "admin_award", related);

    // Referral completion: when a referred user's profile is now complete,
    // mark the referral done and award both parties.
    let referral = null;
    try {
      referral = await completeReferralIfDue(profile.id);
    } catch (err) {
      console.error("Failed to complete referral:", err);
    }

    return NextResponse.json({ award, referral });
  } catch (error) {
    console.error("POST /api/gamification/award error:", error);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
