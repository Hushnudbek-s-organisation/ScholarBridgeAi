/**
 * Sidebar navigation — single source of truth for the student sidebar.
 *
 * WHY THIS EXISTS
 * ---------------
 * `Navbar` renders the sidebar from i18n labels + icons, while the
 * Admin → Navigation manager needs the SAME section ids with plain labels and
 * a default visibility list. Keeping both here means the two sides can never
 * drift apart, and the default hidden list lives in exactly one place
 * (reused by `app_config.nav_hidden_items` defaults).
 */

export interface NavSectionMeta {
  /** Matches `navItems[].id` in Navbar and `activeTab` values in the app. */
  id: string;
  label: string;
  description: string;
  /** Always shown — hiding it would strand the user on an empty shell. */
  locked?: boolean;
  /** Sidebar group the section is listed under (see NAV_GROUPS). */
  group: NavGroupId;
  /** Added in the growth release — shown with a "New" badge for a while. */
  isNew?: boolean;
}

/**
 * Sidebar groups, in display order. Grouping follows the student's journey
 * (find → plan → apply → get help) so a newcomer can guess where things are.
 */
export const NAV_GROUPS = ["start", "explore", "plan", "apply", "help", "account"] as const;
export type NavGroupId = (typeof NAV_GROUPS)[number];

/** Every sidebar section an admin can toggle from Admin → Navigation. */
export const NAV_SECTIONS: NavSectionMeta[] = [
  { id: "dashboard", group: "start", label: "Dashboard", description: "Home overview, 'Your path' guide, next actions and quick links. Must stay visible.", locked: true },
  { id: "universities", group: "explore", label: "University Explorer", description: "Search and save universities and programmes." },
  { id: "scholarships", group: "explore", label: "Scholarship Hub", description: "Scholarship discovery and saved scholarships." },
  { id: "autopilot", group: "explore", label: "Scholarship Autopilot", description: "NEW — one queue of matched scholarships: save, mark applied or hide. Similar suggestions after applying.", isNew: true },
  { id: "opportunities", group: "explore", label: "Opportunities", description: "Personalized opportunities feed." },
  { id: "compare", group: "explore", label: "Country Compare", description: "Country-to-country comparison on published data." },
  { id: "profile", group: "plan", label: "My Profile", description: "Full-page profile editor. Hidden by default — all of its fields now live in Edit Profile." },
  { id: "chancing", group: "plan", label: "My Chances", description: "Fit score and admission-chance estimates." },
  { id: "strength", group: "plan", label: "Profile Strength", description: "Profile completeness and extracurricular analysis." },
  { id: "goals", group: "plan", label: "Goal Planner", description: "NEW — up to 6 focused goals (academic, activities, skills, career) with step-by-step progress.", isNew: true },
  { id: "stories", group: "plan", label: "Admission Stories", description: "NEW — moderated stories of admitted students, with a 'find my twin' match.", isNew: true },
  { id: "similar", group: "plan", label: "Students Like Me", description: "Accepted students with a similar profile." },
  { id: "planning", group: "plan", label: "Planning", description: "Cost calculator, scholarship portfolio and CV tools." },
  { id: "advisor", group: "plan", label: "AI Advisor", description: "AI admissions advisor." },
  { id: "mentors", group: "plan", label: "Mentors", description: "Mentor marketplace." },
  { id: "parent", group: "plan", label: "Parents", description: "Parent dashboard and shared progress view." },
  { id: "applications", group: "apply", label: "Applications", description: "Universal application tracker." },
  { id: "vault", group: "apply", label: "Answer Vault", description: "NEW — answer common application questions once and reuse them everywhere.", isNew: true },
  { id: "sop", group: "apply", label: "AI SOP & Essays", description: "Premium — AI statement of purpose and essay studio." },
  { id: "tasks", group: "apply", label: "Tasks & Roadmap", description: "Premium — application roadmap and task tracking." },
  { id: "visa", group: "apply", label: "Visa Speaking", description: "Visa interview practice assistant." },
  { id: "departure", group: "apply", label: "Departure Checklist", description: "NEW — after the offer: visa, money, housing, travel and arrival steps.", isNew: true },
  { id: "chat", group: "help", label: "AI Mentor", description: "AI mentor chat." },
  { id: "forum", group: "help", label: "Community Forum", description: "Premium — community discussions." },
  { id: "notifications", group: "account", label: "Telegram & Notifications", description: "NEW — connect the Telegram bot (sign-in codes + alerts), pause it or choose which alerts to receive.", isNew: true },
  { id: "payments", group: "account", label: "Premium", description: "Premium subscription and payment history." },
  { id: "rewards", group: "account", label: "Rewards & Referrals", description: "Referral program, points and rewards." },
];

/**
 * Sections hidden from the sidebar by default. The admin can change this any
 * time from Admin → Navigation (stored in `app_config.nav_hidden_items`).
 *
 * - profile     → removed from the sidebar; everything it contained is now in
 *                 Edit Profile.
 * - advisor / mentors / opportunities / compare / parent → removed for now.
 */
export const DEFAULT_HIDDEN_NAV_ITEMS = [
  "profile",
  "advisor",
  "mentors",
  "opportunities",
  "compare",
  "parent",
];

/** Parse the stored config value into a list of hidden section ids. */
export function parseHiddenNav(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_HIDDEN_NAV_ITEMS];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string" && !!v);
    }
  } catch {
    // corrupt value — fall back to defaults instead of breaking the sidebar
  }
  return [...DEFAULT_HIDDEN_NAV_ITEMS];
}

/** Section id → key in the `nav` i18n namespace (for labels outside the Navbar). */
export const NAV_LABEL_KEYS: Record<string, string> = {
  profile: "completeProfile",
  chancing: "chances",
  similar: "similarProfiles",
  applications: "myApplications",
  admin: "adminPanel",
};

export function navLabelKey(id: string): string {
  return NAV_LABEL_KEYS[id] ?? id;
}
