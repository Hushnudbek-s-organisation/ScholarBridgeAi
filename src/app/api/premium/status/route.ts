import { NextResponse } from "next/server";
import { optionalProfileAccess } from "@/lib/auth";
import { getPremiumStatus } from "@/lib/premium";

/**
 * Premium status for the signed-in profile (see lib/premium for the rules:
 * active subscription OR referral grant). Also returns the computed plan
 * (free/premium/admin) for the centralized entitlement system (spec §17).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;
    const access = await optionalProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    if (!profileId) {
      return NextResponse.json({ isPremium: false, plan: "free" });
    }

    return NextResponse.json(await getPremiumStatus(profileId));
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
