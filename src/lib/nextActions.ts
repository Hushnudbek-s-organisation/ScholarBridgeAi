/**
 * Personalized Roadmap — the "What should I do next?" brain (#4).
 *
 * The dashboard centrepiece is a short list of evidence-based next actions.
 * Overdue tracked dates outrank routine planning. Test score gaps alone never
 * create a recommendation: testing needs are programme-specific and may include
 * alternatives or waivers.
 *
 * This module is pure — no DB, no AI, no clock reads — so the ordering can be
 * asserted in `scripts/check-roadmap.ts` and so the dashboard still gives real
 * advice when no AI provider is configured. The LLM only ever writes prose
 * around these grounded actions; it never decides them.
 */

import {
  ACTION_SCORE,
  actionUrgencyFromScore,
  rankActions,
  type RankableAction,
} from "./rankedActions";

export type ActionUrgency = "critical" | "high" | "medium" | "low";

export interface NextAction extends RankableAction {
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
  deadlines: DeadlineLike[];
  applications: ApplicationLike[];
  /** Application ids with an explicit recommender record. */
  recommendationApplicationIds: number[];
  savedUniversityCount: number;
  savedScholarshipCount: number;
  openTaskCount: number;
  requiresFullScholarship: boolean;
  /** Submitted applications with no decision recorded yet. */
  submittedWithoutOutcome: number;
}

const urgencyFromScore = (score: number): ActionUrgency => actionUrgencyFromScore(score);

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

  // --- 1. Student-entered deadlines -------------------------------------
  // Use the exact tracked dates, without generic preparation windows.
  for (const deadline of ctx.deadlines) {
    if (deadline.daysRemaining == null) continue;
    const overdue = deadline.daysRemaining < 0;
    const dueToday = deadline.daysRemaining === 0;
    push({
      id: `deadline-${deadline.id}`,
      title: overdue
        ? `Past tracked deadline: ${deadline.title}`
        : dueToday
          ? `Tracked deadline today: ${deadline.title}`
          : `Tracked deadline: ${deadline.title}`,
      why: overdue
        ? "This date in your tracker has passed. Check the official source to confirm whether submission is still possible, then update your record."
        : dueToday
          ? "Check the official portal’s cutoff time and time zone. If you have already submitted, update your tracker."
          : "Confirm the cutoff, time zone, required materials and submission route with the official source; set any personal reminders that suit your situation.",
      urgency: overdue || dueToday ? "critical" : "medium",
      target: deadline.type === "scholarship" ? "scholarships" : "deadlines",
      score: overdue
        ? ACTION_SCORE.deadlinePassed
        : dueToday
          ? ACTION_SCORE.deadlineToday
          : ACTION_SCORE.deadlineFuture,
      dueInDays: deadline.daysRemaining,
    });
  }

  // --- 2. Programme requirement checks -----------------------------------
  // Do not infer that English or standardized tests apply without programme-
  // level requirement data. The Test Planner handles qualified catalogue clues.

  // --- 3. Profile information --------------------------------------------
  // Optional profile fields are not treated as a completeness target.

  // --- 5. No shortlist yet ----------------------------------------------
  if (ctx.savedUniversityCount === 0 && ctx.applications.length === 0) {
    push({
      id: "build-shortlist",
      title: "Start a programme shortlist",
      why: "No universities are saved yet. Add options you would genuinely consider, then compare subject, current entry requirements, total cost, funding and deadlines. This tool cannot label admission odds.",
      target: "chancing",
      score: 80,
      dueInDays: null,
    });
  }

  // --- 6. Per-application work ------------------------------------------
  const inFlight = ctx.applications.filter(
    (a) => !["decision", "withdrawn"].includes(a.status)
  );
  const essayStage = inFlight.find((a) => a.status === "essay");
  if (essayStage) {
    push({
      id: `essay-${essayStage.id}`,
      title: `Review the essay task for ${essayStage.universityName}`,
      why: "Your tracker marks this application at the essay stage. Reopen the official prompt and word limit, then use your own verified experiences; requirements differ by programme.",
      target: "sop",
      score: 68,
      dueInDays: essayStage.deadlineDaysRemaining ?? null,
    });
  }

  const recommendationsToVerify = inFlight.filter(
    (application) => !ctx.recommendationApplicationIds.includes(application.id)
  );
  if (recommendationsToVerify.length > 0) {
    const names = recommendationsToVerify.slice(0, 3).map((application) => application.universityName);
    const more = recommendationsToVerify.length - names.length;
    const namedApplications = `${names.join(", ")}${more > 0 ? `, and ${more} more` : ""}`;
    push({
      id: "check-recommendations",
      title: "Check whether recommendations are requested",
      why: `No recommender record is on file for ${namedApplications}. Review each official checklist; only if a letter is required, confirm submission instructions and the date with the recommender. Timing varies.`,
      target: "tasks",
      score: 56,
      dueInDays: null,
    });
  }

  const stuck = inFlight.filter((a) => a.status === "not_started");
  if (stuck.length > 0) {
    const a = stuck[0];
    push({
      id: `start-${a.id}`,
      title: `Start your ${a.universityName} application`,
      why: "Your tracker marks this application as not started. Open the official portal to confirm the programme, current deadline and required materials, then record the next verified task.",
      target: "applications",
      score: 68,
      dueInDays: a.deadlineDaysRemaining ?? null,
    });
  }

  // --- 7. Money ----------------------------------------------------------
  if (ctx.requiresFullScholarship && ctx.savedScholarshipCount === 0) {
    push({
      id: "scholarship-portfolio",
      title: "Review funding options against your need",
      why: `A full-scholarship need is recorded, with ${ctx.savedScholarshipCount} option(s) saved. Compare eligibility, confirmed coverage, remaining costs and official deadlines; the number saved does not show whether funding is sufficient.`,
      target: "scholarships",
      score: 72,
      dueInDays: null,
    });
  }

  // --- 8. Momentum / polish ---------------------------------------------
  if (ctx.openTaskCount > 0) {
    push({
      id: "review-open-tasks",
      title: `Review ${ctx.openTaskCount} open tracker task${ctx.openTaskCount === 1 ? "" : "s"}`,
      why: "Check which tasks are still relevant, update stale entries and use verified due dates when deciding what to do next.",
      target: "tasks",
      score: 40,
      dueInDays: null,
    });
  }

  // --- 9. Feed the data flywheel back -----------------------------------
  if (ctx.submittedWithoutOutcome > 0) {
    push({
      id: "report-outcomes",
      title: `Record the decision${ctx.submittedWithoutOutcome === 1 ? "" : "s"} for ${ctx.submittedWithoutOutcome} application${ctx.submittedWithoutOutcome === 1 ? "" : "s"}`,
      why: "A decision is not recorded for these tracked applications. Recording the outcome keeps your own history accurate; any use of shared data is governed separately by your consent settings.",
      target: "applications",
      score: 58,
      dueInDays: null,
    });
  }

  // --- 10. Verified planning facts --------------------------------------
  if (ctx.savedUniversityCount > 0 && ctx.applications.length === 0 && ctx.deadlines.length === 0) {
    push({
      id: "confirm-programme-deadlines",
      title: "Confirm programme deadlines from official sources",
      why: "No application or task deadline is recorded. For each saved programme, confirm the intake, application round and deadline on its official page for your applicant type, then add only verified dates.",
      target: "deadlines",
      score: 32,
      dueInDays: null,
    });
  }

  // Safety net: the panel must never render empty.
  if (actions.length === 0) {
    push({
      id: "keep-going",
      title: "Review your saved programme information",
      why: "No specific task is identified from the records currently available. If your plans change, update only verifiable details and confirm current programme information with official sources.",
      target: "profile",
      score: 10,
      dueInDays: null,
    });
  }

  // Ordering comes from src/lib/rankedActions.ts so the dashboard, the roadmap
  // endpoint and the AI brief can never disagree about which step is first.
  return rankActions(actions);
}

export interface NextActionsResult {
  actions: NextAction[];
  /** Everything that did not make the visible action limit, for the "show all" view. */
  rest: NextAction[];
  /** One-line framing sentence for the dashboard header. */
  headline: string;
  criticalCount: number;
}

/** The dashboard centrepiece: up to three supported actions, in priority order. */
export function buildNextActions(ctx: NextActionsContext, limit = 3): NextActionsResult {
  const all = buildCandidateActions(ctx);
  const actions = all.slice(0, limit);
  const criticalCount = all.filter((a) => a.dueInDays != null && a.dueInDays <= 0).length;

  const overdueCount = all.filter((action) => action.dueInDays != null && action.dueInDays < 0).length;
  const dueTodayCount = all.filter((action) => action.dueInDays === 0).length;
  const dated = all.filter((action) => action.dueInDays != null && action.dueInDays >= 0);
  const nearest = dated.sort((a, b) => (a.dueInDays ?? Number.MAX_SAFE_INTEGER) - (b.dueInDays ?? Number.MAX_SAFE_INTEGER))[0];

  let headline: string;
  if (overdueCount > 0 && dueTodayCount > 0) {
    headline = `${overdueCount} tracked date${overdueCount === 1 ? " has" : "s have"} passed; ${dueTodayCount} ${dueTodayCount === 1 ? "is" : "are"} due today. Check the official sources and update your tracker.`;
  } else if (overdueCount > 0) {
    headline = overdueCount === 1
      ? "One tracked date has passed. Confirm its current status with the official source."
      : `${overdueCount} tracked dates have passed. Confirm their current status with the official sources.`;
  } else if (dueTodayCount > 0) {
    headline = dueTodayCount === 1
      ? "One tracked date is due today. Check the official portal’s cutoff and time zone."
      : `${dueTodayCount} tracked dates are due today. Check each official cutoff and time zone.`;
  } else if (nearest) {
    headline = `Your nearest tracked date is in ${nearest.dueInDays} day${nearest.dueInDays === 1 ? "" : "s"}. Verify its instructions with the official source.`;
  } else if (ctx.applications.length === 0) {
    headline = "No applications are tracked yet. Add one when you choose a programme and want to track its instructions and dates.";
  } else {
    headline = "Review tracked applications and tasks against your current plans; requirements and dates vary by programme.";
  }

  return { actions, rest: all.slice(limit), headline, criticalCount };
}

/**
 * Whole CALENDAR days from `today` to a YYYY-MM-DD date (negative when past).
 *
 * Both sides are truncated to their UTC day first. Rounding a raw timestamp
 * difference instead made "due today" come out as -1 at any hour past midnight
 * (so the dashboard called today's deadline "Overdue") and "due tomorrow" as 0
 * ("Due in 0 days"). Calendar arithmetic is the only definition that matches
 * what a student sees on a calendar, and it now agrees with
 * `calendarDaysUntil` (reminders) and `/api/dashboard`.
 */
export function daysUntil(today: Date, isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const day = String(isoDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(target)) return null;
  return Math.round((target - startOfToday) / 86400000);
}
