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
import { CONFIG_DEFAULTS, getConfigNumber } from "@/lib/config";

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
        getConfigNumber("payment_premium_season_price_uzs", Number(CONFIG_DEFAULTS.payment_premium_season_price_uzs)),
        getConfigNumber("payment_premium_season_days", Number(CONFIG_DEFAULTS.payment_premium_season_days)),
        getConfigNumber("payment_premium_yearly_price_uzs", Number(CONFIG_DEFAULTS.payment_premium_yearly_price_uzs)),
        getConfigNumber("payment_premium_yearly_days", Number(CONFIG_DEFAULTS.payment_premium_yearly_days)),
      ]);

    /**
     * The three regional pricing tiers. `perMonthUzs` lets the checkout show
     * the like-for-like monthly rate (the season and yearly passes are
     * discounted packages, and a student comparing them deserves the same unit).
     * `taglineUz` explains WHO each tier is for, in the app's primary market.
     */
    const packages = [
      {
        id: "monthly",
        label: "Monthly",
        labelUz: "Oylik",
        taglineUz: "Sinab ko'rish uchun — istagan paytda to'xtatasiz",
        priceUzs: monthlyPrice,
        days: monthlyDays,
        perMonthUzs: monthlyPrice,
        currency: PREMIUM_CURRENCY,
      },
      {
        id: "season",
        label: "Application season",
        labelUz: "Qabul mavsumi (3 oy)",
        taglineUz: "Qabul mavsumi uchun eng foydali tanlov",
        priceUzs: seasonPrice,
        days: seasonDays,
        perMonthUzs: Math.round(seasonPrice / Math.max(1, Math.round(seasonDays / 30))),
        currency: PREMIUM_CURRENCY,
        badge: "Eng ommabop",
      },
      {
        id: "yearly",
        label: "Yearly",
        labelUz: "Yillik",
        taglineUz: "Bir yillik tayyorgarlik: eng past oylik narx",
        priceUzs: yearlyPrice,
        days: yearlyDays,
        perMonthUzs: Math.round(yearlyPrice / Math.max(1, Math.round(yearlyDays / 30))),
        currency: PREMIUM_CURRENCY,
        badge: "Eng tejamkor",
      },
    ];

    // Pillar 8 — an admin session is never locked, not even before a profile is
    // selected (the dashboard briefly has no active profile while switching).
    const sessionIsAdmin = Boolean(access.session?.isAdmin);
    if (!profileId) {
      return NextResponse.json({
        isPremium: sessionIsAdmin,
        plan: sessionIsAdmin ? "admin" : "free",
        source: sessionIsAdmin ? "admin" : "none",
        premiumUntil: null,
        features: sessionIsAdmin ? Object.fromEntries(FEATURES.map((f) => [f, true])) : {},
        caps: sessionIsAdmin ? { unlimited: true, caps: {} } : null,
        packages,
      });
    }

    const [status, features, caps] = await Promise.all([
      getPremiumStatus(profileId, sessionIsAdmin),
      featureAccess(profileId, FEATURES, sessionIsAdmin),
      planCapsSnapshot(profileId),
    ]);
    return NextResponse.json({ ...status, features, caps, packages });
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
