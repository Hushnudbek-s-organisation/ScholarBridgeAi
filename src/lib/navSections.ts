/**
 * Sidebar navigation — single source of truth for the student sidebar.
 *
 * WHY THIS EXISTS
 * ---------------
 * `Navbar` renders the sidebar from i18n labels + icons, while the
 * Admin → Navigation manager needs the SAME section ids with plain labels
 * and a default visibility list. Keeping both here means the two sides can
 * never drift apart, and the default hidden list lives in exactly one place
 * (reused by `app_config.nav_hidden_items` defaults).
 *
 * THE EIGHT GROUPS (2026-09-29 reorganization)
 * -------------------------------------------
 * The sidebar used to be a flat list of independent features, which made a
 * student who had just decided to study abroad unable to guess where to
 * start. It is now grouped by the journey they are actually on:
 *
 *   🏠 HOME            → the control center
 *   🔎 DISCOVER        → what exists out there
 *   🧭 MY JOURNEY      → what fits ME, and my plan
 *   📋 PREPARE         → the raw materials
 *   📝 APPLY           → the applications
 *   🎓 AFTER ADMISSION → offer → funding → visa → departure
 *   🤝 HELP            → people and answers
 *   👤 ACCOUNT         → settings, premium, sharing
 *
 * Groups are collapsible on mobile (the drawer can be 40 rows tall otherwise)
 * and always show the group that contains the active page.
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
  /** The journey stage this section belongs to (see src/lib/journey/stages). */
  stage?: string;
}

export type NavGroupId =
  | "home"
  | "discover"
  | "journey"
  | "prepare"
  | "apply"
  | "after"
  | "help"
  | "account";

/** Sidebar groups, in display order. */
export const NAV_GROUPS = [
  "home",
  "discover",
  "journey",
  "prepare",
  "apply",
  "after",
  "help",
  "account",
] as const;

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  home: "Home",
  discover: "Discover",
  journey: "My Journey",
  prepare: "Prepare",
  apply: "Apply",
  after: "After Admission",
  help: "Help",
  account: "Account",
};

export const NAV_GROUP_ICONS: Record<NavGroupId, string> = {
  home: "🏠",
  discover: "🔎",
  journey: "🧭",
  prepare: "📋",
  apply: "📝",
  after: "🎓",
  help: "🤝",
  account: "👤",
};

/** Every sidebar section an admin can toggle from Admin → Navigation. */
export const NAV_SECTIONS: NavSectionMeta[] = [
  { id: "dashboard", group: "home", label: "Dashboard", description: "Home overview, 'Your path' guide, next actions and quick links. Must stay visible.", locked: true, stage: "discover" },

  // ---- DISCOVER ----------------------------------------------------------
  { id: "universities", group: "discover", label: "University Explorer", description: "Search and save universities and programmes.", stage: "discover" },
  { id: "scholarships", group: "discover", label: "Scholarship Hub", description: "Scholarship discovery and saved scholarships.", stage: "discover" },
  { id: "autopilot", group: "discover", label: "Scholarship Autopilot", description: "One queue of matched scholarships: save, mark applied or hide. Similar suggestions after applying.", isNew: true, stage: "discover" },
  { id: "opportunities", group: "discover", label: "Opportunities", description: "Personalized opportunities feed." },
  { id: "compare", group: "discover", label: "Country Compare", description: "Country-to-country comparison on published data." },
  { id: "career", group: "discover", label: "Career & Major Explorer", description: "Career → major → countries → universities → scholarships.", isNew: true, stage: "discover" },

  // ---- MY JOURNEY --------------------------------------------------------
  { id: "study-plan", group: "journey", label: "My Study Plan", description: "Your goal split into ten phases, updated automatically from your real data." },
  { id: "chancing", group: "journey", label: "My Chances", description: "Fit score and admission-chance estimates.", stage: "match" },
  { id: "recommend", group: "journey", label: "Program Recommender", description: "Catalog programs matched to your interests across four separate dimensions: subject fit, published requirements, affordability, funding — plus provenance and plain-language ranking factors. Admission probability is never shown (no validated methodology).", isNew: true, stage: "match" },
  { id: "strength", group: "journey", label: "Profile Strength", description: "Profile readiness by category and what to improve.", stage: "prepare" },
  { id: "goals", group: "journey", label: "Goals", description: "Up to 6 focused goals (academic, activities, skills, career) with step-by-step progress.", isNew: true },
  { id: "activities", group: "journey", label: "My Activities", description: "Volunteering, leadership, projects, competitions — with evidence.", stage: "prepare" },
  { id: "stories", group: "journey", label: "Admission Stories", description: "Moderated stories of admitted students, with a 'find my twin' match.", isNew: true },
  { id: "similar", group: "journey", label: "Students Like Me", description: "Accepted students with a similar profile." },
  { id: "profile", group: "journey", label: "My Profile", description: "Full-page profile editor. Hidden by default — all of its fields now live in Edit Profile." },

  // ---- PREPARE -----------------------------------------------------------
  { id: "documents", group: "prepare", label: "Documents", description: "One vault of documents, reused across every application.", stage: "prepare" },
  { id: "tests", group: "prepare", label: "Test Planner", description: "IELTS / TOEFL / SAT targets, dates and practice tasks.", stage: "prepare" },
  { id: "requirements", group: "prepare", label: "Application Requirements", description: "What a university asks for, with source and last-verified date.", stage: "prepare" },
  { id: "funding", group: "prepare", label: "Financial Plan", description: "Full yearly cost, funding, family budget and the remaining gap.", stage: "fund" },
  { id: "planning", group: "prepare", label: "Cost Calculator", description: "Cost calculator, scholarship portfolio and CV tools." },

  // ---- APPLY -------------------------------------------------------------
  { id: "applications", group: "apply", label: "Applications", description: "Universal application tracker.", stage: "apply" },
  { id: "workspace", group: "apply", label: "Application Workspace", description: "One workspace per university with tabs and a live progress bar.", stage: "apply" },
  { id: "vault", group: "apply", label: "Answer Vault", description: "Answer common application questions once and reuse them everywhere.", isNew: true },
  { id: "sop", group: "apply", label: "AI SOP & Essays", description: "Premium — AI statement of purpose and essay studio." },
  { id: "recommendations", group: "apply", label: "Recommendation Manager", description: "Track every letter from 'not requested' to 'submitted'.", stage: "apply" },
  { id: "tasks", group: "apply", label: "Tasks & Roadmap", description: "Premium — application roadmap and task tracking." },

  // ---- AFTER ADMISSION ---------------------------------------------------
  { id: "offers", group: "after", label: "Offers & Decisions", description: "Pending, accepted, rejected, waitlisted — and the post-admission plan.", isNew: true, stage: "accepted" },
  { id: "post-admission-funding", group: "after", label: "Funding & Deposits", description: "What you must pay, when, and to whom.", stage: "fund" },
  { id: "visa", group: "after", label: "Visa Center", description: "Visa case, documents, appointments, fees and interview practice.", stage: "visa" },
  { id: "interviews", group: "after", label: "Interview Center", description: "University and visa interview simulation with feedback." },
  { id: "departure", group: "after", label: "Departure Planner", description: "After the visa: flight, housing, insurance, packing, arrival.", isNew: true, stage: "depart" },

  // ---- HELP --------------------------------------------------------------
  { id: "advisor", group: "help", label: "AI Advisor", description: "AI admissions advisor." },
  { id: "chat", group: "help", label: "AI Mentor", description: "AI mentor chat." },
  { id: "mentors", group: "help", label: "Mentors", description: "Mentor marketplace." },
  { id: "forum", group: "help", label: "Community", description: "Premium — community discussions." },
  { id: "courses", group: "help", label: "Courses", description: "Premium — video courses with certificates." },
  { id: "consulting", group: "help", label: "Consulting", description: "Book a consultant." },

  // ---- ACCOUNT -----------------------------------------------------------
  { id: "parent", group: "account", label: "Parents", description: "Parent dashboard and shared progress view." },
  { id: "notifications", group: "account", label: "Telegram & Alerts", description: "Connect the Telegram bot (sign-in codes + alerts), pause it or choose which alerts to receive.", isNew: true },
  { id: "payments", group: "account", label: "Premium", description: "Premium subscription and payment history." },
  { id: "rewards", group: "account", label: "Rewards & Referrals", description: "Referral program, points and rewards." },
];

/**
 * When the "NEW" badge stops being shown.
 *
 * The badge is temporary and reserved for a small set of recent feature launches;
 * marking every reorganized section as new would turn the sidebar into noise. Admins do
 * not configure this: it is a release date, not a feature flag.
 */
export const NEW_BADGE_UNTIL = "2026-10-31";

/** True while the release that added these sections is still recent. */
export function isNewBadgeActive(now: Date = new Date()): boolean {
  return now.toISOString().slice(0, 10) <= NEW_BADGE_UNTIL;
}

/**
 * Sections hidden from the sidebar by default. The admin can change this any
 * time from Admin → Navigation (stored in `app_config.nav_hidden_items`).
 *
 * - profile     → removed from the sidebar; everything it contained is now in
 *                 Edit Profile.
 * - advisor / mentors / opportunities / compare / parent → removed for now.
 *
 * NOTE the new sections are deliberately NOT hidden: the whole point of the
 * reorganization is that a new student can see the journey. They can be hidden
 * from Admin → Navigation at any time.
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

/** Every group that has at least one section (the sidebar only shows those). */
export function groupsWithSections(visibleIds: string[]): NavGroupId[] {
  const set = new Set(visibleIds);
  return NAV_GROUPS.filter((g) => NAV_SECTIONS.some((s) => s.group === g && set.has(s.id)));
}
