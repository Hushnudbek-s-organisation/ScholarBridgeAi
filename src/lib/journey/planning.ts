/**
 * My Study Plan phases (spec §12) and Reverse Planning (spec §21).
 *
 * TWO IDEAS, ONE FILE — both are "work backwards from a date", and both are
 * pure so they can be asserted without a database.
 *
 *   • PLAN PHASES   — the ten phases every student passes through, from
 *                     "build profile" to "departure".
 *   • REVERSE PLAN  — given a real deadline, produce the preparation dates that
 *                     must happen BEFORE it. It can never schedule work after
 *                     the deadline itself.
 */

export type PlanPhaseKey =
  | "profile"
  | "tests"
  | "university_research"
  | "scholarship_research"
  | "documents"
  | "applications"
  | "interviews"
  | "admission"
  | "visa"
  | "departure";

export interface PlanPhase {
  key: PlanPhaseKey;
  title: string;
  description: string;
  icon: string;
  /** The sidebar tab where the work for this phase happens. */
  tab: string;
}

export const PLAN_PHASES: readonly PlanPhase[] = [
  { key: "profile", title: "Build profile", description: "Grades, activities, awards and a complete profile.", icon: "🧱", tab: "profile" },
  { key: "tests", title: "Tests", description: "English test and any standardized test, with a target date.", icon: "📝", tab: "tests" },
  { key: "university_research", title: "University research", description: "Shortlist, compare programmes, check requirements.", icon: "🔎", tab: "universities" },
  { key: "scholarship_research", title: "Scholarship research", description: "Find funding that matches your profile and budget.", icon: "💰", tab: "scholarships" },
  { key: "documents", title: "Documents", description: "Passport, transcript, certificates, financial proof.", icon: "📄", tab: "documents" },
  { key: "applications", title: "Applications", description: "Essays, recommendations and submission.", icon: "📝", tab: "applications" },
  { key: "interviews", title: "Interviews", description: "University interviews and visa interview practice.", icon: "🎤", tab: "interviews" },
  { key: "admission", title: "Admission", description: "Offers, decisions and deposits.", icon: "🎓", tab: "offers" },
  { key: "visa", title: "Visa", description: "Visa documents, appointment, fees and interview.", icon: "🛂", tab: "visa" },
  { key: "departure", title: "Departure", description: "Flight, housing, insurance, packing, arrival.", icon: "✈️", tab: "departure" },
] as const;

export type PhaseStatus = "pending" | "in_progress" | "done";

export interface PhaseProgress {
  key: PlanPhaseKey;
  title: string;
  description: string;
  icon: string;
  tab: string;
  status: PhaseStatus;
  /** 0–100 for this phase, derived from the student's real data. */
  pct: number;
  /** What is still missing in this phase. */
  missing: string[];
}

/**
 * Build the live plan: the ten phases, each with a completion number derived
 * from the student's real data. `counts` mirrors the stage engine so the plan
 * and the journey bar can never disagree.
 */
export function buildPhaseProgress(counts: {
  profileComplete: boolean;
  ieltsScore?: number | null;
  testPlanCount: number;
  savedUniversities: number;
  savedScholarships: number;
  documentsReady: number;
  documentsTotal: number;
  applications: number;
  submittedApplications: number;
  interviewSessions: number;
  offersRecorded: number;
  visaCaseStarted: boolean;
  visaApproved: boolean;
  departureReady: boolean;
}): PhaseProgress[] {
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : a > 0 ? 100 : 0);
  const docPct = counts.documentsTotal > 0 ? pct(counts.documentsReady, counts.documentsTotal) : counts.documentsReady > 0 ? 70 : 0;

  const raw: Record<PlanPhaseKey, { p: number; missing: string[] }> = {
    profile: {
      p: counts.profileComplete ? 100 : 30,
      missing: counts.profileComplete ? [] : ["Complete your profile"],
    },
    tests: {
      p: counts.ieltsScore != null ? (counts.testPlanCount > 0 ? 100 : 70) : counts.testPlanCount > 0 ? 40 : 0,
      missing:
        counts.ieltsScore != null
          ? counts.testPlanCount > 0
            ? []
            : ["Set a target date in the Test Planner"]
          : ["Take an English test"],
    },
    university_research: {
      p: counts.savedUniversities >= 6 ? 100 : counts.savedUniversities > 0 ? 50 : 0,
      missing: counts.savedUniversities > 0 ? (counts.savedUniversities >= 6 ? [] : ["Shortlist 6+ universities"]) : ["Shortlist universities"],
    },
    scholarship_research: {
      p: counts.savedScholarships >= 3 ? 100 : counts.savedScholarships > 0 ? 50 : 0,
      missing: counts.savedScholarships > 0 ? (counts.savedScholarships >= 3 ? [] : ["Save 3+ scholarships"]) : ["Find scholarships"],
    },
    documents: {
      p: docPct,
      missing: docPct >= 100 ? [] : counts.documentsTotal > 0 ? ["Finish your document checklist"] : ["Upload your passport and transcript"],
    },
    applications: {
      p: counts.submittedApplications > 0 ? 100 : counts.applications > 0 ? 50 : 0,
      missing:
        counts.submittedApplications > 0 ? [] : counts.applications > 0 ? ["Submit your application"] : ["Start an application"],
    },
    interviews: {
      p: counts.interviewSessions > 0 ? 100 : 0,
      missing: counts.interviewSessions > 0 ? [] : ["Practise at least one interview"],
    },
    admission: {
      p: counts.offersRecorded > 0 ? 100 : 0,
      missing: counts.offersRecorded > 0 ? [] : ["Waiting for decisions"],
    },
    visa: {
      p: counts.visaApproved ? 100 : counts.visaCaseStarted ? 50 : 0,
      missing: counts.visaApproved ? [] : counts.visaCaseStarted ? ["Finish your visa case"] : ["Start your visa case"],
    },
    departure: {
      p: counts.departureReady ? 100 : 0,
      missing: counts.departureReady ? [] : ["Complete the departure checklist"],
    },
  };

  return PLAN_PHASES.map((phase) => {
    const r = raw[phase.key];
    const status: PhaseStatus = r.p >= 100 ? "done" : r.p > 0 ? "in_progress" : "pending";
    return { ...phase, status, pct: r.p, missing: r.missing };
  });
}

// ---------------------------------------------------------------------------
// Reverse planning (spec §21)
// ---------------------------------------------------------------------------

export interface ReverseStep {
  key: string;
  title: string;
  /** ISO date (YYYY-MM-DD), always strictly BEFORE `deadline`. */
  date: string;
  /** How many days before the deadline this step is. */
  daysBefore: number;
  tab: string;
}

/**
 * Build the preparation schedule that leads to a real deadline.
 *
 * `deadline` is the truth. Every generated step is clamped to be strictly
 * earlier — a plan that schedules work on or after the deadline is useless, so
 * `clampBefore` drops any step that would land too late rather than lying about
 * the date. This is asserted in `scripts/check-journey.ts`.
 */
export function reversePlan(deadline: string, kind: "application" | "scholarship" | "visa" = "application"): ReverseStep[] {
  const end = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return [];

  const base: { key: string; title: string; daysBefore: number; tab: string }[] =
    kind === "visa"
      ? [
          { key: "documents", title: "Gather visa documents", daysBefore: 45, tab: "visa" },
          { key: "financial", title: "Prepare financial proof", daysBefore: 35, tab: "funding" },
          { key: "form", title: "Complete the visa application form", daysBefore: 21, tab: "visa" },
          { key: "appointment", title: "Book the embassy appointment", daysBefore: 14, tab: "visa" },
          { key: "interview", title: "Visa interview practice", daysBefore: 7, tab: "interviews" },
          { key: "submit", title: "Attend the appointment and submit", daysBefore: 1, tab: "visa" },
        ]
      : kind === "scholarship"
        ? [
            { key: "documents", title: "Collect every required document", daysBefore: 30, tab: "documents" },
            { key: "essays", title: "Draft the scholarship essay", daysBefore: 24, tab: "sop" },
            { key: "recommendation", title: "Request recommendation letters", daysBefore: 21, tab: "recommendations" },
            { key: "review", title: "Review every document and answer", daysBefore: 10, tab: "workspace" },
            { key: "submit", title: "Submit before the deadline", daysBefore: 2, tab: "workspace" },
          ]
        : [
            { key: "requirements", title: "Review the full requirements checklist", daysBefore: 60, tab: "workspace" },
            { key: "essay_draft", title: "Essay first draft", daysBefore: 40, tab: "sop" },
            { key: "essay_review", title: "Essay review and rewrite", daysBefore: 33, tab: "sop" },
            { key: "recommendation", title: "Recommendation letters requested", daysBefore: 28, tab: "recommendations" },
            { key: "documents", title: "All documents uploaded", daysBefore: 21, tab: "documents" },
            { key: "final_check", title: "Final review of every item", daysBefore: 7, tab: "workspace" },
            { key: "submit", title: "Submit the application", daysBefore: 2, tab: "workspace" },
          ];

  const steps: ReverseStep[] = [];
  for (const s of base) {
    const d = new Date(end.getTime());
    d.setUTCDate(d.getUTCDate() - s.daysBefore);
    const iso = d.toISOString().slice(0, 10);
    // Never schedule on or after the real deadline.
    if (iso >= deadline) continue;
    steps.push({ key: s.key, title: s.title, date: iso, daysBefore: s.daysBefore, tab: s.tab });
  }
  return steps;
}
