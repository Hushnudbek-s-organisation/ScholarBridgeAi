/**
 * Sidebar navigation — single source of truth for the student sidebar.
 *
 * WHY THIS EXISTS
 * ---------------
 * `Navbar` renders the sidebar from i18n labels + icons, the hubs in
 * `src/components/hubs/*` render the matching tabs, and the
 * Admin → Navigation manager needs the SAME ids with plain labels and a
 * default visibility list. Keeping all of it here means the sides can never
 * drift apart, and the default hidden list lives in exactly one place
 * (reused by `app_config.nav_hidden_items` defaults).
 *
 * SIX GROUPS, FOURTEEN DESTINATIONS (2026-10 reorganization)
 * ---------------------------------------------------------
 * Before this file was rewritten the sidebar was a flat list of ~30
 * independent feature links in eight groups. A student who had just decided
 * to study abroad could not tell which of the thirty was "the next thing",
 * and on a phone the drawer was a 30-row wall. It is now the journey they
 * are actually on, with grouped features behind ONE destination each:
 *
 *   🏠 HOME             → Dashboard
 *   🔎 EXPLORE          → Universities & Programs · Scholarships
 *   🧭 MY PLAN          → Study Plan & Tests · Tasks & Timeline ·
 *                         Profile & Goals · Financial Plan
 *   📝 APPLICATIONS     → My Applications · Application Materials
 *   🎓 AFTER ADMISSION  → Offers & Decisions · Funding & Deposits ·
 *                         Visa & Departure
 *   🤝 HELP & LEARNING  → Guidance · Community & Learning
 *
 * Individual features (Answer Vault, Interview Center, Test Planner,
 * Admission Stories …) are PANES inside those destinations — not separate
 * sidebar rows. Panes are deep-linkable (`#materials/essays`) and every old
 * section id still resolves (`#vault`, `#chancing`, `#workspace`) through
 * `LEGACY_SECTION_ALIASES`.
 *
 * Account-level screens (Premium, Telegram & alerts, Rewards, Parents,
 * Admin) are deliberately NOT a seventh journey group: they live in
 * `NAV_UTILITY_SECTIONS`, rendered by the Navbar as an account/utility
 * cluster and included in search + the command palette.
 */

export interface NavPaneMeta {
  /** Pane id — the second half of a `#section/pane` deep link. */
  id: string;
  /** Plain-language label (the UI reads the `navPanes` i18n namespace). */
  label: string;
  /** One line explaining what the tab contains. */
  description: string;
  /** Premium pane — kept behind the existing PremiumGate rules. */
  premium?: boolean;
  /** Recently launched feature: shows a NEW badge on the tab, nothing more. */
  isNew?: boolean;
}

export interface NavSectionMeta {
  /** Matches `activeTab` values in the app shell and the URL hash. */
  id: string;
  label: string;
  description: string;
  /** Always shown — hiding it would strand the user on an empty shell. */
  locked?: boolean;
  /** Sidebar group the section is listed under (see NAV_GROUPS). */
  group: NavGroupId;
  /** Added recently — shown with a "NEW" badge for a while. */
  isNew?: boolean;
  /** The journey stage this destination belongs to (src/lib/journey/stages). */
  stage?: string;
  /** Tabs inside the destination, in display order. */
  panes: NavPaneMeta[];
  /** True when at least one pane is Premium (drives the PRO badge). */
  premium?: boolean;
}

export type NavGroupId = "home" | "explore" | "plan" | "applications" | "after" | "help";

/** Sidebar groups, in display order. Six groups — the whole journey. */
export const NAV_GROUPS = ["home", "explore", "plan", "applications", "after", "help"] as const;

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  home: "Home",
  explore: "Explore",
  plan: "My Plan",
  applications: "Applications",
  after: "After Admission",
  help: "Help & Learning",
};

export const NAV_GROUP_ICONS: Record<NavGroupId, string> = {
  home: "🏠",
  explore: "🔎",
  plan: "🧭",
  applications: "📝",
  after: "🎓",
  help: "🤝",
};

/** i18n key per group (labels are translated, the ids above never are). */
export const NAV_GROUP_I18N: Record<NavGroupId, string> = {
  home: "groupHome",
  explore: "groupExplore",
  plan: "groupPlan",
  applications: "groupApplications",
  after: "groupAfter",
  help: "groupHelp",
};

/** Every sidebar destination an admin can toggle from Admin → Navigation. */
export const NAV_SECTIONS: NavSectionMeta[] = [
  {
    id: "dashboard",
    group: "home",
    label: "Dashboard",
    description:
      "Your journey in one screen: where you are, the one next action, urgent deadlines and progress. Must stay visible.",
    locked: true,
    stage: "discover",
    panes: [],
  },

  // ---- EXPLORE -----------------------------------------------------------
  {
    id: "universities",
    group: "explore",
    label: "Universities & Programs",
    description:
      "Start from a subject or a career — or from a university you already know. Search, compare and see your admission outlook in context.",
    stage: "discover",
    panes: [
      { id: "search", label: "Universities & programs", description: "Search the catalog by country, level, subject and tuition. Save what fits." },
      { id: "careers", label: "Careers & majors", description: "Start from the job you want, then see the majors, countries and universities that lead there." },
      { id: "matches", label: "Program match", description: "Programs matched to your interests on four separate dimensions — never a probability." },
      { id: "outlook", label: "Admission outlook", description: "Your saved shortlist with published requirements you meet, do not meet and where we do not know yet." },
      { id: "countries", label: "Country compare", description: "Compare countries side by side on published cost, visa and intake data." },
    ],
  },
  {
    id: "scholarships",
    group: "explore",
    label: "Scholarships",
    description:
      "Browse scholarships and funding, and see the ones matched to your profile with the reasons why — never submitted for you.",
    isNew: true,
    stage: "discover",
    panes: [
      { id: "browse", label: "Browse scholarships", description: "Search and filter the scholarship catalog, with official sources and last-checked dates." },
      { id: "recommended", label: "Recommended for you", isNew: true, description: "A prioritised queue with the reasons each one matched, the requirements you meet and the ones you do not." },
      { id: "opportunities", label: "Opportunities", description: "Curated programs, competitions and summer schools relevant to your profile." },
    ],
  },

  // ---- MY PLAN -----------------------------------------------------------
  {
    id: "study-plan",
    group: "plan",
    label: "Study Plan & Tests",
    description:
      "Your goal split into phases with dates, your exam targets and the preparation tools that support them.",
    stage: "prepare",
    panes: [
      { id: "plan", label: "Study plan", description: "The ten phases of your journey, updated from your real data, with a next action for each." },
      { id: "tests", label: "Tests & preparation", description: "IELTS / TOEFL / SAT targets, planned dates, attempts and practice tasks." },
      { id: "tools", label: "Cost & CV tools", description: "Cost calculator, scholarship portfolio planner and CV tools." },
    ],
  },
  {
    id: "tasks",
    group: "plan",
    label: "Tasks & Timeline",
    description:
      "Everything you have to do and when it is due — general tasks and the ones tied to a specific application.",
    premium: true,
    stage: "apply",
    panes: [
      { id: "tasks", label: "Tasks & roadmap", description: "Your task list with the reason each task matters and a link straight to the relevant feature." },
      { id: "deadlines", label: "Deadlines", description: "Every upcoming deadline in one list — applications, scholarships, documents and visa steps." },
    ],
  },
  {
    id: "profile",
    group: "plan",
    label: "Profile & Goals",
    description:
      "What universities will see: your readiness by area, the goals you are working on, and the activities and stories that make your application yours.",
    locked: true,
    stage: "prepare",
    panes: [
      { id: "readiness", label: "Readiness", description: "What is complete, what is missing and what to do next. A readiness score never guarantees admission." },
      { id: "goals", label: "Goals", isNew: true, description: "Up to six focused goals with step-by-step progress." },
      { id: "activities", label: "Activities", description: "Volunteering, leadership, projects and competitions — with evidence." },
      { id: "stories", label: "Stories", isNew: true, description: "Moderated stories of admitted students and a 'find my twin' match." },
      { id: "similar", label: "Students like me", description: "Accepted students whose profiles are close to yours." },
      { id: "details", label: "Profile details", description: "Edit the academic, personal, financial and activity fields behind all of the above." },
    ],
  },
  {
    id: "funding",
    group: "plan",
    label: "Financial Plan",
    description:
      "Plan the money BEFORE applying: full yearly cost, your budget, funding you already have and the remaining gap.",
    stage: "fund",
    panes: [],
  },

  // ---- APPLICATIONS ------------------------------------------------------
  {
    id: "applications",
    group: "applications",
    label: "My Applications",
    description:
      "Every application with its status, progress, next deadline and the next useful action. Open one to work on it.",
    stage: "apply",
    panes: [
      { id: "tracker", label: "Applications", description: "The tracker: university and program, status, progress and the next deadline." },
      { id: "workspace", label: "Workspace", description: "One application at a time: requirements, documents, essays, tests, finance and submission." },
    ],
  },
  {
    id: "materials",
    group: "applications",
    label: "Application Materials",
    description:
      "The reusable material behind every application: requirements, documents and saved answers, essays and recommendations, interview practice.",
    premium: true,
    stage: "prepare",
    panes: [
      { id: "requirements", label: "Requirements", description: "What each university asks for, with the source and the date we last verified it." },
      { id: "documents", label: "Documents & saved answers", isNew: true, description: "One vault of documents and reusable answers for the questions every application asks." },
      { id: "essays", label: "Essays & recommendations", description: "Statement of purpose and essay studio plus every recommendation letter you are tracking." },
      { id: "interviews", label: "Interview preparation", description: "University and visa interview practice with feedback." },
    ],
  },

  // ---- AFTER ADMISSION ---------------------------------------------------
  {
    id: "offers",
    group: "after",
    label: "Offers & Decisions",
    description:
      "Offers you have received: pending, accepted, rejected, waitlisted — and the decision plan that follows.",
    isNew: true,
    stage: "accepted",
    panes: [],
  },
  {
    id: "post-admission-funding",
    group: "after",
    label: "Funding & Deposits",
    description:
      "What you must pay after an offer, when, and to whom — deposits, tuition instalments and the funding that covers them.",
    stage: "fund",
    panes: [],
  },
  {
    id: "visa",
    group: "after",
    label: "Visa & Departure",
    description:
      "The visa case, the interview, and everything after it: documents, flights, housing, insurance and arrival.",
    stage: "visa",
    panes: [
      { id: "visa", label: "Visa", description: "Visa requirements for your destination, your case status, appointments and interview practice." },
      { id: "departure", label: "Departure checklist", isNew: true, description: "After the visa: flight, housing, insurance, packing and arrival steps." },
    ],
  },

  // ---- HELP & LEARNING ---------------------------------------------------
  {
    id: "guidance",
    group: "help",
    label: "Guidance",
    description:
      "AI guidance and human consulting, clearly separated. AI is a study aid, not an official admissions authority.",
    stage: "prepare",
    panes: [
      { id: "mentor", label: "AI guidance", description: "The AI mentor chat and the admissions advisor. Free-tier quotas apply; answers are guidance, not official advice." },
      { id: "consulting", label: "Talk to a person", description: "Book a consultant and browse mentors. Prices and Premium requirements are shown before you commit." },
      { id: "faq", label: "FAQ", description: "Common questions about studying abroad and how this platform works." },
    ],
  },
  {
    id: "community",
    group: "help",
    label: "Community & Learning",
    description:
      "Discussions with other students and structured courses that earn certificates.",
    stage: "prepare",
    panes: [
      { id: "forum", label: "Discussions", description: "Ask questions, read answers and follow other students' journeys." },
      { id: "courses", label: "Courses", description: "Structured video courses with progress and certificates." },
    ],
  },
];

/** Ids an admin can see in Admin → Navigation, in display order. */
export const NAV_DESTINATION_IDS = NAV_SECTIONS.map((s) => s.id);

/**
 * Account / utility screens. They are reachable from the sidebar's account
 * cluster, from search and from the command palette — but they are NOT part
 * of the six journey groups (an account is not a stage of the journey).
 */
export interface NavUtilityMeta {
  id: string;
  label: string;
  description: string;
  premium?: boolean;
  isNew?: boolean;
  /** Admin-only entry (never rendered for students). */
  adminOnly?: boolean;
}

export const NAV_UTILITY_SECTIONS: NavUtilityMeta[] = [
  { id: "payments", label: "Premium", description: "Premium subscription, plans and payment history." },
  { id: "notifications", label: "Telegram & alerts", description: "Connect the Telegram bot, pause it, or choose which alerts to receive.", isNew: true },
  { id: "rewards", label: "Rewards & referrals", description: "Referral program, points and rewards." },
  { id: "parent", label: "Parents", description: "Share a read-only progress page with your family.", premium: true },
  { id: "admin", label: "Admin panel", description: "Platform administration.", adminOnly: true },
];

/**
 * When the "NEW" badge stops being shown.
 *
 * The badge is temporary and reserved for a small set of recent feature
 * launches; marking every reorganized section as new would turn the sidebar
 * into noise. Admins do not configure this: it is a release date, not a
 * feature flag.
 */
export const NEW_BADGE_UNTIL = "2026-10-31";

/** True while the release that added these sections is still recent. */
export function isNewBadgeActive(now: Date = new Date()): boolean {
  return now.toISOString().slice(0, 10) <= NEW_BADGE_UNTIL;
}

/**
 * Ids that must never be hidden, whatever the stored config says.
 *
 * `details` is the Profile & Goals → "Profile details" pane — the profile
 * editor. The Edit button on the navbar profile card (and the legacy
 * `profile-details` deep link) navigate straight to `profile/details`, and a
 * hidden pane is unreachable even via deep link. Hiding it therefore breaks
 * profile editing entirely (the student lands on the Readiness overview and
 * can never reach the form). It used to hide a legacy standalone "My
 * Profile" section that no longer exists; the id was later reused by the
 * pane, which is what made the old default break editing.
 */
export const UNHIDEABLE_NAV_ITEMS = ["details"];

/**
 * Sections hidden from the sidebar by default. The admin can change this any
 * time from Admin → Navigation (stored in `app_config.nav_hidden_items`).
 *
 * These are the less-essential pieces of the larger destinations: the
 * country comparison and opportunities panes, the parents page, the AI
 * advisor in the guidance hub and the mentor marketplace.
 *
 * The fourteen destinations themselves are NOT hidden: the whole point of
 * the structure is that a new student can see their journey.
 */
export const DEFAULT_HIDDEN_NAV_ITEMS = [
  "advisor",
  "mentors",
  "opportunities",
  "compare",
  "parent",
];

/** Parse the stored config value into a list of hidden ids. */
export function parseHiddenNav(raw: string | null | undefined): string[] {
  const stripUnhideable = (ids: string[]) =>
    ids.filter((id) => !UNHIDEABLE_NAV_ITEMS.includes(id));
  if (!raw) return stripUnhideable([...DEFAULT_HIDDEN_NAV_ITEMS]);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // A stored "details" predates the fix that made the profile editor
      // pane unhideable — drop it so an old config cannot break editing.
      return stripUnhideable(
        parsed.filter((v): v is string => typeof v === "string" && !!v)
      );
    }
  } catch {
    // corrupt value — fall back to defaults instead of breaking the sidebar
  }
  return stripUnhideable([...DEFAULT_HIDDEN_NAV_ITEMS]);
}

/**
 * Old section ids → the destination (and tab) that now contains them.
 *
 * The app used to be a flat list of sections, so saved links, Telegram
 * buttons, notifications and browser bookmarks point at ids that are now
 * panes. Every one of them keeps working: `resolveNavTarget` maps the old id
 * to the new destination + pane instead of falling back to the dashboard.
 */
export const LEGACY_SECTION_ALIASES: Record<string, { section: string; pane?: string }> = {
  // Explore
  career: { section: "universities", pane: "careers" },
  recommend: { section: "universities", pane: "matches" },
  chancing: { section: "universities", pane: "outlook" },
  outlook: { section: "universities", pane: "outlook" },
  matches: { section: "universities", pane: "matches" },
  careers: { section: "universities", pane: "careers" },
  compare: { section: "universities", pane: "countries" },
  autopilot: { section: "scholarships", pane: "recommended" },
  opportunities: { section: "scholarships", pane: "opportunities" },
  // My Plan
  planning: { section: "study-plan", pane: "tools" },
  tests: { section: "study-plan", pane: "tests" },
  "study-plan": { section: "study-plan", pane: "plan" },
  deadlines: { section: "tasks", pane: "deadlines" },
  tasks: { section: "tasks", pane: "tasks" },
  strength: { section: "profile", pane: "readiness" },
  goals: { section: "profile", pane: "goals" },
  activities: { section: "profile", pane: "activities" },
  stories: { section: "profile", pane: "stories" },
  similar: { section: "profile", pane: "similar" },
  "profile-details": { section: "profile", pane: "details" },
  // Applications
  tracker: { section: "applications", pane: "tracker" },
  workspace: { section: "applications", pane: "workspace" },
  requirements: { section: "materials", pane: "requirements" },
  documents: { section: "materials", pane: "documents" },
  vault: { section: "materials", pane: "documents" },
  sop: { section: "materials", pane: "essays" },
  recommendations: { section: "materials", pane: "essays" },
  interviews: { section: "materials", pane: "interviews" },
  // After admission
  departure: { section: "visa", pane: "departure" },
  // Help & learning
  chat: { section: "guidance", pane: "mentor" },
  advisor: { section: "guidance", pane: "mentor" },
  mentors: { section: "guidance", pane: "consulting" },
  consulting: { section: "guidance", pane: "consulting" },
  forum: { section: "community", pane: "forum" },
  courses: { section: "community", pane: "courses" },
  learning: { section: "community", pane: "courses" },
};

/** Every id that may appear in a URL hash (destinations + aliases + utility). */
export const LINKABLE_SECTION_IDS: string[] = [
  ...NAV_SECTIONS.map((s) => s.id),
  ...NAV_UTILITY_SECTIONS.map((u) => u.id),
  ...Object.keys(LEGACY_SECTION_ALIASES),
];

export interface NavTarget {
  /** Destination id (always a NAV_SECTIONS id). */
  section: string;
  /** Pane id inside the destination, or null for single-pane destinations. */
  pane: string | null;
  /** Utility screen (Premium, Telegram & alerts …) instead of a destination. */
  utility: boolean;
}

/**
 * Resolve any known id (new destination, pane id, legacy id or utility id)
 * into where the app should navigate. Returns null for unknown ids so callers
 * can ignore a stale hash instead of jumping to the dashboard.
 */
export function resolveNavTarget(id: string, pane?: string | null): NavTarget | null {
  if (!id) return null;
  let clean = id.trim();
  if (!clean) return null;

  // `#materials/essays` (and palette ids shaped the same way) carry the tab in
  // the id itself, so a pane deep link is one string everywhere.
  let inlinePane: string | null = null;
  if (clean.includes("/")) {
    const [head, ...rest] = clean.split("/");
    clean = head;
    inlinePane = rest.join("/") || null;
  }
  const wantedPane = inlinePane ?? pane ?? null;

  const utility = NAV_UTILITY_SECTIONS.find((u) => u.id === clean);
  if (utility) return { section: utility.id, pane: null, utility: true };

  const destination = NAV_SECTIONS.find((s) => s.id === clean);
  if (destination) {
    const wanted = wantedPane ? destination.panes.find((p) => p.id === wantedPane) : undefined;
    const fallback = destination.panes[0]?.id ?? null;
    return { section: destination.id, pane: wanted ? wanted.id : fallback, utility: false };
  }

  // A bare pane id (e.g. `#outlook`) resolves inside the destination that owns it.
  for (const section of NAV_SECTIONS) {
    if (section.panes.some((p) => p.id === clean)) {
      return { section: section.id, pane: clean, utility: false };
    }
  }

  const alias = LEGACY_SECTION_ALIASES[clean];
  if (alias) {
    const target = resolveNavTarget(alias.section, alias.pane ?? wantedPane);
    return target ? { ...target, utility: false } : null;
  }

  return null;
}

/** True when the id names a destination, pane, alias or utility screen. */
export function isLinkableSection(id: string): boolean {
  return resolveNavTarget(id) !== null;
}

/** Deep-link string for a destination/pane pair (`#materials/essays`). */
export function navHash(section: string, pane?: string | null): string {
  const target = resolveNavTarget(section, pane ?? null);
  if (!target) return "#dashboard";
  return target.pane ? `#${target.section}/${target.pane}` : `#${target.section}`;
}

/** Section id → key in the `nav` i18n namespace (for labels outside the Navbar). */
export const NAV_LABEL_KEYS: Record<string, string> = {
  applications: "myApplications",
  "profile-details": "completeProfile",
};

export function navLabelKey(id: string): string {
  return NAV_LABEL_KEYS[id] ?? id;
}

/** Every group that has at least one section (the sidebar only shows those). */
export function groupsWithSections(visibleIds: string[]): NavGroupId[] {
  const set = new Set(visibleIds);
  return NAV_GROUPS.filter((g) => NAV_SECTIONS.some((s) => s.group === g && set.has(s.id)));
}

/**
 * The group a destination belongs to — used by the phone bottom bar so the
 * "Explore" / "My Plan" button stays highlighted on any of its destinations.
 */
export function groupOfSection(id: string): NavGroupId | null {
  const resolved = resolveNavTarget(id);
  if (!resolved) return null;
  return NAV_SECTIONS.find((s) => s.id === resolved.section)?.group ?? null;
}

/** Panes of a destination, minus the ids an admin has hidden. */
export function visiblePanes(sectionId: string, hidden: string[]): NavPaneMeta[] {
  const section = NAV_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [];
  return section.panes.filter((p) => !hidden.includes(p.id));
}

/** Destination id → key in the `nav` i18n namespace for its label. */
export const NAV_SECTION_LABEL_KEYS: Record<string, string> = {
  dashboard: "dashboard",
  universities: "universities",
  scholarships: "scholarships",
  "study-plan": "studyPlan",
  tasks: "tasks",
  profile: "profileGoals",
  funding: "fundingPlan",
  applications: "myApplications",
  materials: "materials",
  offers: "offers",
  "post-admission-funding": "postAdmissionFunding",
  visa: "visaDeparture",
  guidance: "guidance",
  community: "community",
  payments: "payments",
  notifications: "notifications",
  rewards: "rewards",
  parent: "parent",
  admin: "adminPanel",
};
