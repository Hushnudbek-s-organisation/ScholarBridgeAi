import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";
import { referralPremiumActive } from "@/lib/referrals";
import { desc, eq, isNotNull, count } from "drizzle-orm";
import { sanitizeProfile } from "@/lib/password";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const profiles = await db
      .select()
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.id));

    // Referral data for the whole list in ONE grouped query instead of two
    // queries per student (the admin list is the only place that shows who
    // invited whom, so it must stay usable with thousands of profiles).
    const invited = await db
      .select({
        referrerId: studentProfiles.referredBy,
        total: count(),
        rewarded: count(sql`CASE WHEN ${studentProfiles.referralRewarded} THEN 1 END`),
      })
      .from(studentProfiles)
      .where(isNotNull(studentProfiles.referredBy))
      .groupBy(studentProfiles.referredBy);
    const invitedBy = new Map(invited.map((row) => [row.referrerId, row]));

    const enriched = [];
    for (const profile of profiles) {
      const sub = await findActiveSubscription(profile.id);
      const paidActive = subscriptionIsActive(sub);
      // A student can hold premium from a PAID subscription or from a referral
      // milestone. This list used to report only the subscription, so a student
      // whose dashboard said "Premium until 16 Oct" appeared as free here.
      // Both sources are reported, with the effective state and its source.
      // The profile columns now mirror EVERY premium grant (paid, gifted or
      // referral), so they prove the WINDOW, not where it came from. The
      // subscription row is checked first and wins the source label.
      const profileWindow = referralPremiumActive(profile);
      const invitedRow = invitedBy.get(profile.id);
      enriched.push({
        ...sanitizeProfile(profile),
        isPremium: paidActive || profileWindow,
        premiumUntil: paidActive && sub ? sub.currentPeriodEnd : profileWindow ? profile.premiumUntil : null,
        premiumSource: paidActive ? "subscription" : profileWindow ? "referral" : null,
        referralPoints: profile.referralPoints ?? 0,
        referredCount: Number(invitedRow?.total ?? 0),
        referredRewardedCount: Number(invitedRow?.rewarded ?? 0),
      });
    }

    return NextResponse.json({ profiles: enriched });
  } catch (error) {
    console.error("GET /api/admin/profiles error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
