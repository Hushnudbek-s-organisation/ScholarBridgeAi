/**
 * The single server-side answer to "is this account Premium, and may it use
 * feature X?". Used by GET /api/premium/status (the website's PremiumGate)
 * and by the Telegram bot / Mini App, so no channel can reach a Premium
 * feature the website would lock.
 *
 * Premium is active when EITHER a paid subscription is active (Payme/Click,
 * `subscriptions` table) OR premium was granted through the referral system
 * (`student_profiles.is_premium` + `premium_until`).
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSession, type Session } from "@/lib/auth";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { featurePlan, profilePlan, type FeatureKey, type Plan } from "@/lib/entitlements";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";
import { referralPremiumActive } from "@/lib/referrals";

export interface PremiumStatus {
  isPremium: boolean;
  source: "subscription" | "referral" | "none";
  premiumUntil: Date | string | null;
  plan: Plan;
}

const PLAN_LEVEL: Record<Plan, number> = { free: 0, premium: 1, admin: 2 };

export async function getPremiumStatus(profileId: number): Promise<PremiumStatus> {
  const sub = await findActiveSubscription(profileId);
  const subscriptionActive = subscriptionIsActive(sub);
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  const referralActive = profile ? referralPremiumActive(profile) : false;
  const isPremium = subscriptionActive || referralActive;
  const source = subscriptionActive ? "subscription" : referralActive ? "referral" : "none";
  return {
    isPremium,
    source,
    premiumUntil: referralActive ? profile?.premiumUntil ?? null : subscriptionActive ? sub?.currentPeriodEnd ?? null : null,
    // premium_until only bounds referral grants — a paid subscription carries
    // its own period end, so it must not be cut short by an old referral date.
    plan: profile
      ? profilePlan({ isAdmin: profile.isAdmin, isPremium, premiumUntil: source === "referral" ? profile.premiumUntil : null })
      : "free",
  };
}

/** May this profile use the feature? (config-driven plan mapping, real premium status) */
export async function hasFeature(profileId: number, feature: FeatureKey): Promise<boolean> {
  const [{ plan }, required] = await Promise.all([getPremiumStatus(profileId), featurePlan(feature)]);
  return PLAN_LEVEL[plan] >= PLAN_LEVEL[required];
}

/** Error code API routes return when a Premium feature is requested on a free plan. */
export const PREMIUM_REQUIRED_CODE = "premium_required";

/**
 * Server-side Premium gate for API routes. The website's PremiumGate only
 * decides what to render; every API behind a Premium feature must also call
 * this, otherwise a free account can use the feature by calling the API
 * directly. Returns null when allowed, otherwise the 403 response to send.
 */
export async function premiumGate(profileId: number, feature: FeatureKey): Promise<NextResponse | null> {
  if (await hasFeature(profileId, feature)) return null;
  return NextResponse.json(
    { error: "This feature is part of Premium.", code: PREMIUM_REQUIRED_CODE, feature },
    { status: 403 }
  );
}

/** Which gated features this profile may use — lets the website lock exactly what the API locks. */
export async function featureAccess(profileId: number, features: readonly FeatureKey[]): Promise<Record<string, boolean>> {
  const [{ plan }, required] = await Promise.all([
    getPremiumStatus(profileId),
    Promise.all(features.map((f) => featurePlan(f))),
  ]);
  return Object.fromEntries(features.map((f, i) => [f, PLAN_LEVEL[plan] >= PLAN_LEVEL[required[i]]]));
}

/**
 * Signed-in account that may use `feature` — for API routes with no profile
 * id in the request (e.g. reading the forum). 401 without a session, 403
 * `premium_required` without the feature.
 */
export async function requireFeatureSession(
  req: Request,
  feature: FeatureKey
): Promise<{ ok: true; session: Session } | { ok: false; response: NextResponse }> {
  const auth = await requireSession(req);
  if (!auth.ok) {
    return { ok: false, response: NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status }) };
  }
  const locked = await premiumGate(auth.session.profile.id, feature);
  if (locked) return { ok: false, response: locked };
  return { ok: true, session: auth.session };
}
