/**
 * Personalized Roadmap — the "What should I do next?" brain (#4).
 *
 * The dashboard centrepiece is three actions, not a to-do list of forty. Picking
 * the right three is a deterministic decision: an overdue application deadline
 * always outranks "join a club", and a missing IELTS blocks everything else for
 * a student who needs an English test.
 *
 * This module is pure — no DB, no AI, no clock reads — so the ordering can be
 * asserted in `scripts/check-roadmap.ts` and so the dashboard still gives real
 * advice when no AI provider is configured. The LLM only ever writes prose
 * around these three actions; it never decides them.
 */

export type ActionUrgency = "critical" | "high" | "medium" | "low";

export interface NextAction {
  id: string;
  title: string;
  /** One sentence the student can act on. */
  why: string;
  urgency: ActionUrgency;
  /** Which tab the CTA opens. */
  target: "profile" | "chancing" | "applications" | "tracker" | "sop" | "deadlines" | "tasks" | "scholarships" | "visa";
  /** Score used for ordering — higher wins. Not shown to the student. */
  score: number;
  dueInDays: number | null;
}

export interface DeadlineLike {
  id: string;
  title: string;
  type: string;
  daysRemaining: number | null;
}

export interface ApplicationLike {
  id: number;
  universityName: string;
  status: string;
  deadlineDaysRemaining?: number | null;
}

export interface NextActionsContext {
  /** Injected so tests are deterministic. */
  today: Date;
  completeness: number; // 0–1
  deadlines: DeadlineLike[];
  applications: ApplicationLike[];
  hasEnglishTest: boolean;
  needsEnglishTest: boolean;
  hasStandardizedTest: boolean;
  requiresStandardizedTest: boolean;
  hasEssay: boolean;
  recommendationsRequested: boolean;
  savedUniversityCount: number;
  savedScholarshipCount: number;
  openTaskCount: number;
  requiresFullScholarship: boolean;
  /** Submitted applications with no decision recorded yet. */
  submittedWithoutOutcome: number;
  graduationYear?: number | null;
}

const MONTH_MS = 30 * 86400000;

const urgencyFromScore = (score: number): ActionUrgency => {
  if (score >= 90) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
};

/** Days until 1 June of the admission cycle before graduation. */
function cycleStart(ctx: NextActionsContext): number | null {
  if (!ctx.graduationYear) return null;
  // Applications for a Fall intake open ~18 months before graduation.
  const target = new Date(Date.UTC(ctx.graduationYear - 1, 8, 1)); // 1 Sep
  return Math.round((target.getTime() - ctx.today.getTime()) / 86400000);
}

/**
 * Build every candidate action with a score. Sorted by score, ties broken by
 * the nearest deadline so the ordering is stable and reproducible.
 */
export function buildCandidateActions(ctx: NextActionsContext): NextAction[] {
  const actions: NextAction[] = [];
  // `urgency` may be pinned explicitly (an overdue deadline is critical
  // regardless of its score); otherwise it is derived from the score.
  const push = (a: Omit<NextAction, "urgency"> & { urgency?: ActionUrgency }) => {
    actions.push({ ...a, urgency: a.urgency ?? urgencyFromScore(a.score) });
  };

  // --- 1. Anything overdue or due within two weeks -----------------------
  for (const d of ctx.deadlines) {
    if (d.daysRemaining === null) continue;
    if (d.daysRemaining > 14) continue;
    const overdue = d.daysRemaining < 0;
    push({
      id: `deadline-${d.id}`,
      title: overdue ? `Overdue: ${d.title}` : `Due in ${d.daysRemaining} day${d.daysRemaining === 1 ? "" : "s"}: ${d.title}`,
      why: overdue
        ? "This date has already passed — check whether a late or rolling option still exists, otherwise drop it and move on."
        : "Less than two weeks left. This is the only thing that should matter today.",
      urgency: "critical",
      target: d.type === "scholarship" ? "scholarships" : "deadlines",
      score: overdue ? 100 : 98,
      dueInDays: d.daysRemaining,
    });
  }

  // --- 2. Deadlines in the 15–45 day window ------------------------------
  for (const d of ctx.deadlines) {
    if (d.daysRemaining === null || d.daysRemaining <= 14 || d.daysRemaining > 45) continue;
    push({
      id: `deadline-${d.id}`,
      title: `Prepare: ${d.title}`,
      why: `${d.daysRemaining} days left — enough time, but recommendation letters and transcripts are the slow parts.`,
      urgency: "high",
      target: d.type === "scholarship" ? "scholarships" : "deadlines",
      score: 70 - (d.daysRemaining - 15) * 0.3,
      dueInDays: d.daysRemaining,
    });
  }

  // --- 3. Blockers: a missing required test stops every application ------
  if (ctx.needsEnglishTest && !ctx.hasEnglishTest) {
    push({
      id: "book-english-test",
      title: "Book your IELTS / TOEFL / Duolingo test",
      why: "No English score on file. Test centres fill up and results take 2–3 weeks, so this blocks every application you plan to submit.",
      target: "profile",
      score: 88,
      dueInDays: 21,
    });
  }
  if (ctx.requiresStandardizedTest && !ctx.hasStandardizedTest) {
    push({
      id: "book-standardized-test",
      title: "Register for the SAT / ACT / GRE",
      why: "Some of your target programmes expect a standardized score. Registration closes weeks before the test date.",
      target: "profile",
      score: 74,
      dueInDays: 45,
    });
  }

  // --- 4. Profile too thin to advise on ---------------------------------
  if (ctx.completeness < 0.5) {
    push({
      id: "complete-profile",
      title: "Finish your profile",
      why: `Only ${Math.round(ctx.completeness * 100)}% complete. Every estimate and recommendation gets sharper with each field you fill in.`,
      target: "profile",
      score: 84,
      dueInDays: 7,
    });
  } else if (ctx.completeness < 0.8) {
    push({
      id: "complete-profile",
      title: "Add the missing profile details",
      why: `${Math.round(ctx.completeness * 100)}% complete — awards, leadership and a career goal are what separate a strong file from an average one.`,
      target: "profile",
      score: 45,
      dueInDays: 14,
    });
  }

  // --- 5. No shortlist yet ----------------------------------------------
  if (ctx.savedUniversityCount === 0 && ctx.applications.length === 0) {
    push({
      id: "build-shortlist",
      title: "Build a balanced shortlist",
      why: "No universities saved yet. Aim for 8–12: 2–3 reach, 4–5 target, 2–3 safety.",
      target: "chancing",
      score: 80,
      dueInDays: 14,
    });
  } else if (ctx.savedUniversityCount + ctx.applications.length < 6) {
    push({
      id: "balance-shortlist",
      title: "Widen your shortlist",
      why: `Only ${ctx.savedUniversityCount + ctx.applications.length} on your list. Six to twelve applications is what makes an offer likely.`,
      target: "chancing",
      score: 55,
      dueInDays: 30,
    });
  }

  // --- 6. Per-application work ------------------------------------------
  const inFlight = ctx.applications.filter(
    (a) => !["decision", "withdrawn"].includes(a.status)
  );
  const needsEssay = inFlight.filter((a) => ["not_started", "preparing", "essay"].includes(a.status));
  if (needsEssay.length > 0 && !ctx.hasEssay) {
    const a = needsEssay[0];
    push({
      id: `essay-${a.id}`,
      title: `Draft your essay for ${a.universityName}`,
      why: "The essay is the part of the application you fully control — and the part committees actually read. Start early; version 3 is the good one.",
      target: "sop",
      score: 78,
      dueInDays: a.deadlineDaysRemaining ?? 30,
    });
  }

  if (!ctx.recommendationsRequested && inFlight.length > 0) {
    push({
      id: "request-recommendations",
      title: "Ask your recommenders now",
      why: `${inFlight.length} application${inFlight.length === 1 ? "" : "s"} in progress with no recommendation letters requested. Teachers need 3–4 weeks minimum.`,
      target: "tasks",
      score: 76,
      dueInDays: 30,
    });
  }

  const stuck = inFlight.filter((a) => a.status === "not_started");
  if (stuck.length > 0) {
    const a = stuck[0];
    push({
      id: `start-${a.id}`,
      title: `Start your ${a.universityName} application`,
      why: "Still not started. Open the portal, fill in the biographical sections and see the exact document list — that turns a vague task into small ones.",
      target: "applications",
      score: 68,
      dueInDays: a.deadlineDaysRemaining ?? 30,
    });
  }

  // --- 7. Money ----------------------------------------------------------
  if (ctx.requiresFullScholarship && ctx.savedScholarshipCount < 3) {
    push({
      id: "scholarship-portfolio",
      title: "Build a scholarship portfolio",
      why: "You need a full scholarship but have under 3 saved. Apply to 10+ — scholarship deadlines are earlier than admission deadlines.",
      target: "scholarships",
      score: 72,
      dueInDays: 30,
    });
  }

  // --- 8. Momentum / polish ---------------------------------------------
  if (ctx.openTaskCount > 8) {
    push({
      id: "clear-tasks",
      title: "Clear your oldest open tasks",
      why: `${ctx.openTaskCount} open milestones. Finishing three small ones this week beats staring at a long list.`,
      target: "tasks",
      score: 40,
      dueInDays: 7,
    });
  }

  const cycle = cycleStart(ctx);
  if (cycle !== null && cycle > 240 && ctx.completeness >= 0.8 && ctx.applications.length === 0) {
    push({
      id: "build-profile-depth",
      title: "Deepen your extracurriculars",
      why: "Applications are far off — this is the cheapest time to build depth. One sustained leadership role beats five one-week activities.",
      target: "profile",
      score: 35,
      dueInDays: 90,
    });
  }

  // --- 9. Feed the data flywheel back -----------------------------------
  if (ctx.submittedWithoutOutcome > 0) {
    push({
      id: "report-outcomes",
      title: `Record the decision${ctx.submittedWithoutOutcome === 1 ? "" : "s"} for ${ctx.submittedWithoutOutcome} application${ctx.submittedWithoutOutcome === 1 ? "" : "s"}`,
      why: "Your results are missing from the tracker. Recording them — including rejections — is what sharpens the estimates for you and for every student after you.",
      target: "applications",
      score: 58,
      dueInDays: 7,
    });
  }

  // --- 10. Timing-dependent prep ----------------------------------------
  const cycle2 = cycleStart(ctx);
  if (cycle2 !== null && cycle2 > 0 && cycle2 <= 180 && ctx.applications.length === 0) {
    push({
      id: "visa-financial-prep",
      title: "Start your visa and financial documents",
      why: `Applications open in about ${Math.round(cycle2 / 30)} months. Translated transcripts, bank statements and the blocked-account paperwork are the slowest items on the list.`,
      target: "tasks",
      score: 48,
      dueInDays: cycle2,
    });
  }
  if (cycle2 !== null && cycle2 > 180 && ctx.applications.length === 0) {
    push({
      id: "plan-calendar",
      title: "Plan your application calendar",
      why: "You have time, which is exactly when deadlines get missed. Write down each programme's round and deadline now, while it costs nothing.",
      target: "deadlines",
      score: 32,
      dueInDays: 60,
    });
  }

  // --- 11. Standing maintenance -----------------------------------------
  push({
    id: "review-chances",
    title: "Re-check your admission estimates",
    why: "Estimates move as your profile changes and as other students apply. A five-minute review keeps your reach/target/safety split honest.",
    target: "chancing",
    score: 20,
    dueInDays: null,
  });

  // Safety net: the panel must never render empty.
  if (actions.length === 0) {
    push({
      id: "keep-going",
      title: "Keep your profile current",
      why: "Nothing is urgent right now. Add any new award, course or activity as it happens — admissions files are judged on the whole arc.",
      target: "profile",
      score: 10,
      dueInDays: null,
    });
  }

  return actions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.dueInDays ?? Number.MAX_SAFE_INTEGER;
    const db = b.dueInDays ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

export interface NextActionsResult {
  actions: NextAction[];
  /** Everything that did not make the top three, for the "show all" view. */
  rest: NextAction[];
  /** One-line framing sentence for the dashboard header. */
  headline: string;
  criticalCount: number;
}

/** The dashboard centrepiece: exactly three actions, in priority order. */
export function buildNextActions(ctx: NextActionsContext, limit = 3): NextActionsResult {
  const all = buildCandidateActions(ctx);
  const actions = all.slice(0, limit);
  const criticalCount = all.filter((a) => a.urgency === "critical").length;

  let headline: string;
  if (criticalCount > 0) {
    headline =
      criticalCount === 1
        ? "One deadline needs you today."
        : `${criticalCount} deadlines need you today.`;
  } else if (ctx.completeness < 0.5) {
    headline = "Your profile is still thin — fill it in first, everything else gets better after.";
  } else if (ctx.applications.length === 0) {
    headline = "Nothing submitted yet. Here is the order that works.";
  } else {
    headline = "You are on track. These three move you furthest this week.";
  }

  return { actions, rest: all.slice(limit), headline, criticalCount };
}

/** Days from `today` to a YYYY-MM-DD date (negative when past). */
export function daysUntil(today: Date, isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / MONTH_MS === 0 ? 0 : ms / 86400000);
}
