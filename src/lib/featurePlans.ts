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

export const DEFAULT_FEATURE_PLAN: Record<FeatureKey, Plan> = {
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
