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
  { id: "profile", check: "profile", tab: "profile" },
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

export const HELP_SECTIONS = [
  "dashboard",
  "universities",
  "scholarships",
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
    title: "Reach your target IELTS score",
    description: "Most scholarships ask for IELTS 6.5–7.0. A clear 8-week plan beats random practice.",
    steps: ["Take a full mock test to find your band", "Pick your weakest skill and practise it 4× a week", "Do 2 timed Writing Task 2 essays per week and get feedback", "Book the real exam date", "Take a final mock 1 week before"],
    level: "any",
    estWeeks: 8,
  },
  {
    pillar: "academic",
    title: "Raise your GPA this semester",
    description: "Admissions officers look at the trend. One strong semester can change the story.",
    steps: ["List every course and your current grade", "Choose 2 courses to improve by one grade", "Book weekly office hours / tutor time", "Review progress at mid-term"],
    level: "any",
    estWeeks: 16,
  },
  {
    pillar: "activities",
    title: "Start a club or community project",
    description: "Founding something small and real shows initiative more than joining ten clubs.",
    steps: ["Pick a problem you care about in your school or mahalla", "Find 2–3 people to start with", "Run the first event or session", "Measure the impact (people reached, hours, money raised)", "Write a 150-character activity description"],
    level: "any",
    estWeeks: 10,
  },
  {
    pillar: "activities",
    title: "Enter an olympiad or competition",
    description: "National olympiads, hackathons and essay contests are strong, verifiable achievements.",
    steps: ["Choose one competition that fits your major", "Note the registration deadline", "Practise with past problems weekly", "Register and compete", "Add the result to your profile"],
    level: "high_school",
    estWeeks: 12,
  },
  {
    pillar: "skills",
    title: "Build a portfolio project",
    description: "A finished project (app, research poster, design set) you can link in applications.",
    steps: ["Pick a project you can finish in 6 weeks", "Break it into weekly milestones", "Publish it (GitHub, website or PDF)", "Ask a teacher or mentor for feedback"],
    level: "any",
    estWeeks: 6,
  },
  {
    pillar: "skills",
    title: "Practise public speaking",
    description: "Helps with interviews, visa appointments and leadership roles.",
    steps: ["Record a 2-minute self-introduction", "Present once in class or a club", "Do 3 mock interviews in Visa Speaking", "Give one talk to a bigger audience"],
    level: "any",
    estWeeks: 6,
  },
  {
    pillar: "career",
    title: "Get a recommendation letter",
    description: "Ask early — teachers write better letters when they have time.",
    steps: ["Choose 2 teachers who know your work", "Prepare a one-page brag sheet", "Ask in person and give the deadline", "Send a thank-you note after submission"],
    level: "any",
    estWeeks: 4,
  },
  {
    pillar: "career",
    title: "Do a summer programme or internship",
    description: "Real experience in your field makes your essays and interviews concrete.",
    steps: ["Shortlist 5 programmes in Opportunities", "Prepare CV and short motivation letter", "Apply to at least 3", "Plan what you want to learn and document it"],
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
  { phase: "offer", title: "Compare your offers", description: "Put total cost, scholarship and job prospects side by side before deciding.", linkTab: "planning" },
  { phase: "offer", title: "Accept one offer and pay the deposit", description: "Note the acceptance deadline — offers expire.", linkTab: "applications" },
  { phase: "offer", title: "Decline the other offers politely", description: "Frees the place for another student and keeps a good record.", linkTab: null },
  { phase: "visa", title: "Get your CAS / I-20 / admission letter", description: "The university issues it after you accept — you need it for the visa.", linkTab: null },
  { phase: "visa", title: "Book the visa appointment", description: "Appointment slots in Tashkent can fill up weeks ahead.", linkTab: null },
  { phase: "visa", title: "Practise the visa interview", description: "Run at least 3 mock interviews.", linkTab: "visa" },
  { phase: "money", title: "Prepare proof of funds", description: "Bank statement or sponsor letter covering tuition + living costs for the required period.", linkTab: "planning" },
  { phase: "money", title: "Get an international bank card", description: "Visa/Mastercard that works abroad for the first weeks.", linkTab: null },
  { phase: "housing", title: "Apply for student accommodation", description: "University halls open applications right after you accept.", linkTab: null },
  { phase: "travel", title: "Buy flight tickets", description: "Arrive a few days before orientation week.", linkTab: null },
  { phase: "travel", title: "Arrange health insurance", description: "Many countries require it for the visa or on arrival.", linkTab: null },
  { phase: "travel", title: "Make copies of all documents", description: "Passport, visa, offer letter, diplomas — paper + cloud copy.", linkTab: null },
  { phase: "arrival", title: "Register with the university and local authorities", description: "Some countries require police/residence registration within days of arrival.", linkTab: null },
  { phase: "arrival", title: "Get a local SIM card and open a bank account", description: "", linkTab: null },
];
