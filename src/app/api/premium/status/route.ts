import { NextResponse } from "next/server";
import { optionalProfileAccess } from "@/lib/auth";
import { featureAccess, getPremiumStatus } from "@/lib/premium";
import { DEFAULT_FEATURE_PLAN, type FeatureKey } from "@/lib/entitlements";
import { planCapsSnapshot } from "@/lib/planLimits";
import {
  getPremiumPriceUzs,
  getPremiumPeriodDays,
  PREMIUM_CURRENCY,
} from "@/lib/payments";
import { getConfigNumber } from "@/lib/config";

const FEATURES = Object.keys(DEFAULT_FEATURE_PLAN) as FeatureKey[];

/**
 * Premium status for the signed-in profile (see lib/premium for the rules:
 * active subscription OR referral grant). Also returns the computed plan
 * (free/premium/admin) and, per gated feature, whether this profile may use
 * it — the same answer the APIs enforce with `premiumGate`, so the website
 * never locks what the server allows (or shows what it refuses).
 *
 * Also returns free-tier quantitative caps (saves, workspaces, visa) and the
 * published Pro packages (monthly / season / yearly) so the UI never hardcodes
 * prices or limits.
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

    const [monthlyPrice, monthlyDays, seasonPrice, seasonDays, yearlyPrice, yearlyDays] =
      await Promise.all([
        getPremiumPriceUzs(),
        getPremiumPeriodDays(),
        getConfigNumber("payment_premium_season_price_uzs", 149000),
        getConfigNumber("payment_premium_season_days", 90),
        getConfigNumber("payment_premium_yearly_price_uzs", 499000),
        getConfigNumber("payment_premium_yearly_days", 365),
      ]);

    const packages = [
      {
        id: "monthly",
        label: "Monthly",
        labelUz: "Oylik",
        priceUzs: monthlyPrice,
        days: monthlyDays,
        currency: PREMIUM_CURRENCY,
      },
      {
        id: "season",
        label: "Application season",
        labelUz: "Ariza mavsumi (3 oy)",
        priceUzs: seasonPrice,
        days: seasonDays,
        currency: PREMIUM_CURRENCY,
        badge: "Best for applicants",
      },
      {
        id: "yearly",
        label: "Yearly",
        labelUz: "Yillik",
        priceUzs: yearlyPrice,
        days: yearlyDays,
        currency: PREMIUM_CURRENCY,
        badge: "Save more",
      },
    ];

    if (!profileId) {
      return NextResponse.json({
        isPremium: false,
        plan: "free",
        features: {},
        caps: null,
        packages,
      });
    }

    const [status, features, caps] = await Promise.all([
      getPremiumStatus(profileId),
      featureAccess(profileId, FEATURES),
      planCapsSnapshot(profileId),
    ]);
    return NextResponse.json({ ...status, features, caps, packages });
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
