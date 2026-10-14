/**
 * Growth features — shared constants and first-run seed content.
 *
 * Pure data, safe to import from client and server. The catalogues below are
 * only used to seed EMPTY tables once; after that everything is edited from
 * Admin → Growth tools (the admin can rewrite or delete every row).
 */

// ---------------------------------------------------------------------------
// Journey ("Your path") — ApplyBoard's "Register → Search → Apply → Funding →
// Visa" flow merged with Crimson's timeline idea, re-cut for our sections.
// ---------------------------------------------------------------------------

export type JourneyCheck =
  | "profile"
  | "universities"
  | "shortlist"
  | "scholarships"
  | "answers"
  | "applications"
  | "visa"
  | "departure";

export interface JourneyStepDef {
  id: string;
  /** Automatic completion rule evaluated on the server. */
  check: JourneyCheck;
  /** Sidebar section the "Open" button goes to ("profile" opens the editor). */
  tab: string;
}

/** Built-in order. Titles/descriptions come from i18n (`journey.steps.<id>`). */
export const JOURNEY_STEPS: JourneyStepDef[] = [
  { id: "profile", check: "profile", tab: "profile/details" },
  { id: "explore", check: "universities", tab: "universities" },
  { id: "chances", check: "shortlist", tab: "chancing" },
  { id: "funding", check: "scholarships", tab: "autopilot" },
  { id: "materials", check: "answers", tab: "vault" },
  { id: "apply", check: "applications", tab: "applications" },
  { id: "visa", check: "visa", tab: "visa" },
  { id: "departure", check: "departure", tab: "departure" },
];

/** Admin override for one step (stored in app_config.journey_steps). */
export interface JourneyStepOverride {
  id: string;
  enabled?: boolean;
  /** Custom text replaces the translated default for every language. */
  title?: string;
  description?: string;
}

export function parseJourneyOverrides(raw: string | null | undefined): JourneyStepOverride[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const known = new Set(JOURNEY_STEPS.map((s) => s.id));
    const seen = new Set<string>();
    const out: JourneyStepOverride[] = [];
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: unknown }).id ?? "");
      if (!known.has(id) || seen.has(id)) continue;
      seen.add(id);
      const o = item as Record<string, unknown>;
      out.push({
        id,
        enabled: o.enabled !== false,
        title: typeof o.title === "string" ? o.title.slice(0, 80) : undefined,
        description: typeof o.description === "string" ? o.description.slice(0, 280) : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Apply the admin's order/visibility/text to the built-in steps. Steps the
 * admin never touched keep their default position at the end, so adding a
 * new built-in step later never silently disappears.
 */
export function resolveJourneySteps(overrides: JourneyStepOverride[]) {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const ordered = [
    ...overrides.map((o) => JOURNEY_STEPS.find((s) => s.id === o.id)!).filter(Boolean),
    ...JOURNEY_STEPS.filter((s) => !byId.has(s.id)),
  ];
  return ordered.map((s) => {
    const o = byId.get(s.id);
    return {
      ...s,
      enabled: o?.enabled !== false,
      title: o?.title?.trim() || null,
      description: o?.description?.trim() || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Section intros ("What is this page?") — short help banners for newcomers.
// Default text is translated (`help.<section>`); the admin can switch any of
// them off or replace the text (app_config.section_help).
// ---------------------------------------------------------------------------

/**
 * Sections the "what is this page?" banner may appear on.
 *
 * The first block is the current navigation (six groups, fourteen
 * destinations); the second keeps the ids of features that are now tabs, so an
 * admin override written before the reorganization still applies to the page
 * where that feature now lives.
 */
export const HELP_SECTIONS = [
  "dashboard",
  "universities",
  "scholarships",
  "study-plan",
  "tasks",
  "profile",
  "funding",
  "applications",
  "materials",
  "offers",
  "post-admission-funding",
  "visa",
  "guidance",
  "community",
  // legacy ids (features that became tabs)
  "chancing",
  "strength",
  "similar",
  "stories",
  "autopilot",
  "vault",
  "goals",
  "departure",
  "planning",
  "applications",
  "sop",
  "tasks",
  "chat",
  "visa",
  "forum",
  "rewards",
  "notifications",
] as const;

export type HelpSection = (typeof HELP_SECTIONS)[number];

export interface SectionHelpOverride {
  enabled?: boolean;
  text?: string;
}

export function parseSectionHelp(raw: string | null | undefined): Record<string, SectionHelpOverride> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, SectionHelpOverride> = {};
    for (const key of HELP_SECTIONS) {
      const o = (v as Record<string, unknown>)[key];
      if (!o || typeof o !== "object") continue;
      const r = o as Record<string, unknown>;
      out[key] = {
        enabled: r.enabled !== false,
        text: typeof r.text === "string" && r.text.trim() ? r.text.trim().slice(0, 400) : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Enumerations shared by UI, API validation and admin forms.
// ---------------------------------------------------------------------------

export const GOAL_PILLARS = ["academic", "activities", "skills", "career"] as const;
export type GoalPillar = (typeof GOAL_PILLARS)[number];
/** Crimson Rise caps active outcomes per year — we keep the focus rule. */
export const MAX_ACTIVE_GOALS = 6;

export const GOAL_LEVELS = ["any", "high_school", "undergrad", "grad"] as const;

export const PROMPT_CATEGORIES = ["general", "motivation", "career", "leadership", "challenge", "community"] as const;

export const CHECKLIST_PHASES = ["offer", "visa", "money", "housing", "travel", "arrival"] as const;
export type ChecklistPhase = (typeof CHECKLIST_PHASES)[number];

export const STORY_STATUSES = ["pending", "approved", "rejected"] as const;

// ---------------------------------------------------------------------------
// First-run seed content (only inserted into EMPTY tables).
// ---------------------------------------------------------------------------

export const SEED_GOAL_TEMPLATES: {
  pillar: GoalPillar;
  title: string;
  description: string;
  steps: string[];
  level: (typeof GOAL_LEVELS)[number];
  estWeeks: number;
}[] = [
  {
    pillar: "academic",
    title: "Check English-language requirements",
    description: "Accepted tests, minimum scores and waivers vary by programme. Verify the official requirements before deciding whether to prepare for or book a test.",
    steps: ["List the programmes you are considering", "Check accepted tests, score rules and waivers on each official page", "Record any accepted alternatives or exemptions", "Decide whether a test is needed for these targets", "If needed, plan preparation around the published requirement and your schedule"],
    level: "any",
    estWeeks: 8,
  },
  {
    pillar: "academic",
    title: "Review your academic progress",
    description: "Use current records and feedback to identify any coursework where additional support would help; this does not predict an admissions decision.",
    steps: ["Check your current grades against school records", "Identify a course or topic where support may help", "Ask a teacher or advisor about available options", "Review progress at a date that fits your school calendar"],
    level: "any",
    estWeeks: 16,
  },
  {
    pillar: "activities",
    title: "Plan a project around an interest",
    description: "Only take this on if it is meaningful and manageable for you; no new activity is required simply to strengthen an application.",
    steps: ["Choose a problem or interest you genuinely care about", "Decide on a manageable scope and timeline", "Find collaborators if useful", "Record what you actually do and complete", "Describe verifiable outcomes without inventing impact"],
    level: "any",
    estWeeks: 10,
  },
  {
    pillar: "activities",
    title: "Explore a relevant competition",
    description: "If a competition fits your interests and eligibility, it can be one way to document subject engagement; it is not required for every application.",
    steps: ["Check current competitions related to your interests", "Verify eligibility, format, costs and dates on the official page", "Decide whether participation fits your plans", "Prepare using official materials if you choose to enter", "Record only the result you actually achieve"],
    level: "high_school",
    estWeeks: 12,
  },
  {
    pillar: "skills",
    title: "Complete a project you care about",
    description: "A project may be useful when it relates to your goals and a target programme accepts this kind of evidence; verify submission formats first.",
    steps: ["Choose a project that fits your interests and available time", "Set milestones that work for your schedule", "Keep dated notes or files showing your contribution", "Ask for feedback if relevant", "Share it only in formats accepted by the programme"],
    level: "any",
    estWeeks: 6,
  },
  {
    pillar: "skills",
    title: "Practise communication for a relevant setting",
    description: "Practice may help with presentations or interviews when they are part of your plans; it is not a universal admissions requirement.",
    steps: ["Choose a real presentation or conversation goal", "Prepare a short introduction in your own words", "Practise with a trusted listener if useful", "Review specific feedback and decide what to refine"],
    level: "any",
    estWeeks: 6,
  },
  {
    pillar: "career",
    title: "Check reference requirements",
    description: "Reference rules differ by programme. Confirm whether a letter is needed, who may provide it and how it must be submitted before making a request.",
    steps: ["Read the official checklist for each programme", "Confirm the number, eligible recommender and format", "If a letter is required, ask someone who can accurately discuss your work", "Share the official prompt, submission method and deadline", "Confirm availability and track submission status"],
    level: "any",
    estWeeks: 4,
  },
  {
    pillar: "career",
    title: "Explore a relevant summer programme or internship",
    description: "Consider an opportunity only if its subject, eligibility, timing, cost and format fit your circumstances and goals.",
    steps: ["Review current opportunities related to your interests", "Check eligibility, dates, costs and required materials on official pages", "Apply only to options you are eligible for and genuinely want", "Keep a record of your actual role and work", "Describe verified learning or outcomes without overstatement"],
    level: "any",
    estWeeks: 12,
  },
];

export const SEED_ANSWER_PROMPTS: {
  category: (typeof PROMPT_CATEGORIES)[number];
  question: string;
  hint: string;
  wordLimit: number | null;
}[] = [
  { category: "general", question: "Tell us about yourself.", hint: "Who you are, where you come from and what drives you — in plain words.", wordLimit: 150 },
  { category: "motivation", question: "Why do you want to study this subject?", hint: "One real moment that made you choose it beats a list of adjectives.", wordLimit: 250 },
  { category: "motivation", question: "Why do you want to study abroad?", hint: "What you cannot get at home and what you will bring back.", wordLimit: 200 },
  { category: "career", question: "What are your career goals after graduation?", hint: "Short-term (first job) and long-term (10 years). Connect them to your country.", wordLimit: 200 },
  { category: "leadership", question: "Describe a time you showed leadership.", hint: "Situation → what YOU did → result with a number if possible.", wordLimit: 250 },
  { category: "challenge", question: "Describe a challenge you overcame.", hint: "Focus on what you learned and how you changed, not only the problem.", wordLimit: 250 },
  { category: "community", question: "How have you contributed to your community?", hint: "Volunteering, helping family, teaching others — small and real counts.", wordLimit: 200 },
  { category: "general", question: "Describe your greatest achievement.", hint: "Pick one, explain why it matters to you.", wordLimit: 150 },
];

export const SEED_CHECKLIST_ITEMS: {
  phase: ChecklistPhase;
  title: string;
  description: string;
  linkTab: string | null;
}[] = [
  { phase: "offer", title: "Compare your offers", description: "Compare programme fit, published requirements, total cost, confirmed funding and your own priorities before deciding.", linkTab: "planning" },
  { phase: "offer", title: "Review acceptance instructions", description: "Check the response date, any deposit and refund terms, and official payment instructions; only pay when required.", linkTab: "applications" },
  { phase: "offer", title: "Update other applications if needed", description: "Follow each provider's instructions and stated dates; do not assume that you must decline other offers.", linkTab: null },
  { phase: "visa", title: "Check required university and destination documents", description: "Document names and conditions vary. Confirm the current university and immigration checklists; do not assume a specific document applies.", linkTab: null },
  { phase: "visa", title: "Check visa or study-permit steps", description: "Use official government, embassy and university sources to confirm whether an application or appointment is required; fees and timing vary.", linkTab: null },
  { phase: "visa", title: "Check whether an interview is required", description: "If official guidance requires one, use it to prepare truthful answers; do not assume every destination requires an interview.", linkTab: "visa" },
  { phase: "money", title: "Confirm evidence-of-funds requirements", description: "Evidence type, amount, account rules and coverage vary. Use the official destination checklist; do not assume a blocked account applies.", linkTab: "planning" },
  { phase: "money", title: "Plan how to access money after arrival", description: "Review payment and banking options, fees and university guidance based on your needs; no specific card is required.", linkTab: null },
  { phase: "housing", title: "Check accommodation options", description: "Availability, costs, eligibility and application dates differ. Confirm details with the university or official housing provider.", linkTab: null },
  { phase: "travel", title: "Plan travel after confirming dates", description: "Confirm travel permission, programme dates and university arrival instructions before booking.", linkTab: null },
  { phase: "travel", title: "Confirm health-coverage requirements", description: "Rules vary by destination and programme. Verify official guidance before choosing or purchasing coverage.", linkTab: null },
  { phase: "travel", title: "Organize important documents", description: "Use the official checklist to decide which documents and copies to carry or store securely; protect personal information.", linkTab: null },
  { phase: "arrival", title: "Check registration steps after arrival", description: "Confirm whether local or university registration applies, where to complete it and by when using official guidance.", linkTab: null },
  { phase: "arrival", title: "Review local services after arrival", description: "Explore a SIM card, banking or transport options if useful; availability, fees and rules vary.", linkTab: null },
];
