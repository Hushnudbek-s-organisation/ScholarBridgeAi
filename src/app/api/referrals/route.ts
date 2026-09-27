import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { getReferralOverview, applyReferralCode } from "@/lib/referrals";
import { clampString, readJsonBody } from "@/lib/request";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const overview = await getReferralOverview(profileId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GET /api/referrals error:", error);
    return NextResponse.json({ error: "Failed to fetch referral info" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 4 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const { profileId, referralCode } = parsed.body;
    if (!profileId || !referralCode) {
      return NextResponse.json({ error: "profileId and referralCode are required" }, { status: 400 });
    }
    // Only the account itself may claim a referral: applying codes to other
    // people's profiles would farm referral rewards (free Premium).
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const limit = checkRateLimit(`referral:apply:${access.session.profile.id}`, LIMITS.contact);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
    const result = await applyReferralCode(access.targetId!, clampString(referralCode, 64));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ referral: result.referral });
  } catch (error) {
    console.error("POST /api/referrals error:", error);
    return NextResponse.json({ error: "Failed to apply referral code" }, { status: 500 });
  }
}
