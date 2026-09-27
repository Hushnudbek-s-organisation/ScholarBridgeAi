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
