import { NextResponse } from "next/server";
import { optionalProfileAccess } from "@/lib/auth";
import { featureAccess, getPremiumStatus } from "@/lib/premium";
import { DEFAULT_FEATURE_PLAN, type FeatureKey } from "@/lib/entitlements";

const FEATURES = Object.keys(DEFAULT_FEATURE_PLAN) as FeatureKey[];

/**
 * Premium status for the signed-in profile (see lib/premium for the rules:
 * active subscription OR referral grant). Also returns the computed plan
 * (free/premium/admin) and, per gated feature, whether this profile may use
 * it — the same answer the APIs enforce with `premiumGate`, so the website
 * never locks what the server allows (or shows what it refuses).
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
      return NextResponse.json({ isPremium: false, plan: "free", features: {} });
    }

    const [status, features] = await Promise.all([
      getPremiumStatus(profileId),
      featureAccess(profileId, FEATURES),
    ]);
    return NextResponse.json({ ...status, features });
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
