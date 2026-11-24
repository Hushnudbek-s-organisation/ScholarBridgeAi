import type {db} from "@/db";
import { getConfig } from "@/lib/config";

import { DEFAULT_FEATURE_PLAN, type FeatureKey, type Plan } from "@/lib/featurePlans";
export type { FeatureKey, Plan } from "@/lib/featurePlans";

/** Free-tier quantitative caps (Pro = unlimited). Overridable via app_config. */
export const FREE_CAPS = {
  saved_universities: 10,
  saved_scholarships: 10,
  application_workspaces: 1,
  /** Free visa practice sessions per day (rubric + AI). */
  visa_practice_per_day: 2,
} as const;

const PLAN_LEVEL: Record<Plan, number> = { free: 0, premium: 1, admin: 2 };

export function profilePlan(profile: {
  isAdmin?: boolean | null;
  isPremium?: boolean | null;
  premiumUntil?: string | Date | null;
}): Plan {
  if (profile.isAdmin) return "admin";
  if (profile.isPremium) {
    if (profile.premiumUntil) {
      const until = profile.premiumUntil instanceof Date ? profile.premiumUntil : new Date(profile.premiumUntil);
      if (until.getTime() > Date.now()) return "premium";
      return "free";
    }
    return "premium";
  }
  return "free";
}

/** Config-driven override for a feature's required plan. */
export async function featurePlan(feature: FeatureKey, database?:Pick<typeof db,"select">): Promise<Plan> {
  try {
    const raw = await getConfig(`feature_${feature}`,database);
    if (raw === "free" || raw === "premium" || raw === "admin") return raw;
  } catch {
    // fall through to default
  }
  return DEFAULT_FEATURE_PLAN[feature];
}

/** Does this profile have access to the feature? (server-side check) */
export async function can(profile: { isAdmin?: boolean | null; isPremium?: boolean | null; premiumUntil?: string | Date | null } | null, feature: FeatureKey): Promise<boolean> {
  if (!profile) return false;
  const userPlan = profilePlan(profile);
  if (userPlan === "admin") return true;
  const required = await featurePlan(feature);
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[required];
}

/** Sync check used by PremiumGate (keeps the existing component working). */
export function canSync(
  profile: { isAdmin?: boolean | null; isPremium?: boolean | null; premiumUntil?: string | Date | null } | null,
  feature: FeatureKey
): boolean {
  if (!profile) return false;
  const userPlan = profilePlan(profile);
  if (userPlan === "admin") return true;
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[DEFAULT_FEATURE_PLAN[feature]];
}

export { DEFAULT_FEATURE_PLAN };
