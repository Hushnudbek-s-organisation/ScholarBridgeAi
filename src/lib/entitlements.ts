import { getConfig } from "@/lib/config";

export type Plan = "free" | "premium" | "admin";

export type FeatureKey =
  | "university_basic"
  | "university_advanced"
  | "scholarship_basic"
  | "scholarship_advanced"
  | "ai_general"
  | "ai_essay"
  | "ai_advanced"
  | "roadmap"
  | "forum"
  | "forum_write"
  | "courses"
  | "courses_full"
  | "deadline_center"
  | "documents"
  | "documents_upload"
  | "notifications_advanced"
  | "parent_dashboard"
  | "visa_unlimited"
  | "workspace_unlimited"
  | "saves_unlimited";

/**
 * Centralized entitlements (spec §17 + Free/Pro product matrix).
 *
 * FREE keeps the "start from zero" promise:
 *   search + match, save (limited), study plan / basic roadmap, basic deadlines,
 *   test planner + document checklist, AI chat (daily quota), forum READ,
 *   course intro lessons, 1 application workspace.
 *
 * PRO unlocks quality / unlimited:
 *   SOP AI, deep profile audit, unlimited saves & workspaces, extended reminders,
 *   unlimited visa practice, forum WRITE, full courses, file vault upload,
 *   parent dashboard, recommendation vault extras.
 *
 * Feature → minimum plan is configurable via app_config
 * (`feature_<name> = free|premium|admin`) so admins can override without code.
 */

const DEFAULT_FEATURE_PLAN: Record<FeatureKey, Plan> = {
  university_basic: "free",
  university_advanced: "premium",
  scholarship_basic: "free",
  scholarship_advanced: "premium",
  ai_general: "free",
  ai_essay: "premium",
  ai_advanced: "premium",
  // Basic roadmap + study plan stay free (the 0→1 promise). Premium adds depth.
  roadmap: "free",
  // Reading the forum is free; writing needs Pro.
  forum: "free",
  forum_write: "premium",
  // Catalog + intro lessons free; full course content needs Pro.
  courses: "free",
  courses_full: "premium",
  // Basic deadline list + Telegram reminders free; extended offsets need Pro.
  deadline_center: "free",
  // Checklist free; file vault upload is Pro.
  documents: "free",
  documents_upload: "premium",
  notifications_advanced: "premium",
  parent_dashboard: "premium",
  visa_unlimited: "premium",
  workspace_unlimited: "premium",
  saves_unlimited: "premium",
};

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
export async function featurePlan(feature: FeatureKey): Promise<Plan> {
  try {
    const raw = await getConfig(`feature_${feature}`);
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
