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
}

/** Every sidebar section an admin can toggle from Admin → Navigation. */
export const NAV_SECTIONS: NavSectionMeta[] = [
  { id: "dashboard", label: "Dashboard", description: "Home overview, next actions and quick links. Must stay visible.", locked: true },
  { id: "universities", label: "University Explorer", description: "Search and save universities and programmes." },
  { id: "scholarships", label: "Scholarship Hub", description: "Scholarship discovery and saved scholarships." },
  { id: "profile", label: "My Profile", description: "Full-page profile editor. Hidden by default — all of its fields now live in Edit Profile." },
  { id: "chancing", label: "My Chances", description: "Fit score and admission-chance estimates." },
  { id: "strength", label: "Profile Strength", description: "Profile completeness and extracurricular analysis." },
  { id: "advisor", label: "AI Advisor", description: "AI admissions advisor." },
  { id: "similar", label: "Students Like Me", description: "Accepted students with a similar profile." },
  { id: "planning", label: "Planning", description: "Cost calculator, scholarship portfolio and CV tools." },
  { id: "mentors", label: "Mentors", description: "Mentor marketplace." },
  { id: "opportunities", label: "Opportunities", description: "Personalized opportunities feed." },
  { id: "compare", label: "Country Compare", description: "Country-to-country comparison on published data." },
  { id: "parent", label: "Parents", description: "Parent dashboard and shared progress view." },
  { id: "applications", label: "Applications", description: "Universal application tracker." },
  { id: "sop", label: "AI SOP & Essays", description: "Premium — AI statement of purpose and essay studio." },
  { id: "tasks", label: "Tasks & Roadmap", description: "Premium — application roadmap and task tracking." },
  { id: "chat", label: "AI Mentor", description: "AI mentor chat." },
  { id: "visa", label: "Visa Speaking", description: "Visa interview practice assistant." },
  { id: "forum", label: "Community Forum", description: "Premium — community discussions." },
  { id: "payments", label: "Premium", description: "Premium subscription and payment history." },
  { id: "rewards", label: "Rewards & Referrals", description: "Referral program, points and rewards." },
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
