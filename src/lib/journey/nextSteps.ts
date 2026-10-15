/**
 * Next Steps (spec §3): the 3–5 highest-priority things to do, each with a
 * [Continue] button.
 *
 * This EXTENDS the existing `src/lib/nextActions.ts` idea (deterministic
 * ordering, an overdue deadline outranks "join a club") but reads the richer
 * journey inputs. It stays PURE — no DB, no AI, no clock — so the ordering is
 * assertable in `scripts/check-journey.ts` and the dashboard still gives real
 * advice when no AI provider is configured.
 *
 * A step is a real, checkable fact ("your recommendation letter is not
 * requested yet"), never a vague nudge, and never a probability claim.
 */

export type StepUrgency = "critical" | "high" | "medium" | "low";

import {
  deadlineScore,
  dedupeRanked,
  rankActions,
  type RankableAction,
} from "../rankedActions";

export interface NextStep extends RankableAction {
  id: string;
  /** Translation key in journey.nextStepTitle, unless rawTitleKind is set. */
  titleKey: string;
  /** Translation key in journey.nextStepDetail. */
  detailKey: string;
  values?: Record<string, string | number>;
  /** Student-entered deadline or a stage need that the UI localizes by key. */
  rawTitle?: string;
  rawTitleKind?: "deadline" | "journey";
  urgency: StepUrgency;
  /** 🔴 / 🟡 / 🟢 / ⚪ — what the dashboard shows in front of the title. */
  dot: string;
  dueInDays: number | null;
  /** Where the [Continue] button goes. */
  tab: string;
  /** Internal ordering key — higher wins. Never shown. */
  score: number;
}

export interface DeadlineInput {
  id: string;
  title: string;
  daysRemaining: number | null;
  tab?: string;
}

export interface NextStepsInput {
  journey: { current: string; stillNeeded: { text: string; tab: string }[] };
  appRows: { id: number; universityName: string; deadline: string | null; submitted: boolean; status: string }[];
  openRequirements: number;
  deadlines: DeadlineInput[];
  gaps: { testType: string; state: string; current: number | null; catalogueFigure: number | null; messageKey: string }[];
  recommendations: { submitted: number; outstanding: number };
  documents: { ready: number; total: number; expiring: number };
  tests: { ielts: number | null; target: number | null };
  funding: { gap: number; covered: boolean } | null;
}

function urgencyOf(days: number | null): { urgency: StepUrgency; dot: string } {
  if (days == null) return { urgency: "low", dot: "⚪" };
  if (days <= 0) return { urgency: "critical", dot: "🔴" };
  return { urgency: "medium", dot: "🟢" };
}

/**
 * A tracked date changes ordering only by being past, today, or in the future.
 * The exact calendar-day difference breaks ties; no generic preparation window
 * is assumed for every programme or document.
 *
 * The bands come from src/lib/rankedActions.ts, which `buildNextActions`
 * (roadmap endpoint + AI brief) uses too — one definition, one order.
 */
function baseScore(days: number | null): number {
  return deadlineScore(days);
}

export function computeNextActions(input: NextStepsInput, limit = 5): NextStep[] {
  const steps: NextStep[] = [];
  const add = (step: Omit<NextStep, "urgency" | "dot"> & { urgency?: StepUrgency; dot?: string }) => {
    const defaults = urgencyOf(step.dueInDays);
    steps.push({ ...step, urgency: step.urgency ?? defaults.urgency, dot: step.dot ?? defaults.dot });
  };

  // ---- 1. Student-entered deadlines --------------------------------------
  const datedDeadlines = input.deadlines
    .filter((deadline) => deadline.daysRemaining != null)
    .sort((a, b) => (a.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (b.daysRemaining ?? Number.MAX_SAFE_INTEGER));
  const soonest = datedDeadlines[0] ?? input.deadlines[0];
  if (soonest) {
    const days = soonest.daysRemaining;
    const detailKey = days == null
      ? "deadlineNoDate"
      : days < 0
        ? "deadlinePassed"
        : days === 0
          ? "deadlineToday"
          : "deadlineDays";
    add({
      id: `deadline-${soonest.id}`,
      titleKey: "",
      rawTitle: soonest.title,
      rawTitleKind: "deadline",
      detailKey,
      values: days == null ? undefined : { days: Math.abs(days) },
      dueInDays: days,
      tab: soonest.tab ?? "deadlines",
      score: baseScore(days) + 25,
    });
  }

  // ---- 2. Application-specific checklist rows ----------------------------
  if (input.openRequirements > 0) {
    const firstOpen = input.appRows.find((application) => !application.submitted);
    const days = soonest?.daysRemaining ?? null;
    add({
      id: "requirements-open",
      titleKey: "applicationRequirements",
      detailKey: firstOpen?.universityName ? "applicationRequirementsSpecific" : "applicationRequirementsGeneral",
      values: { count: input.openRequirements, application: firstOpen?.universityName ?? "" },
      dueInDays: days,
      tab: "workspace",
      score: baseScore(days) + 15,
    });
  }

  // ---- 3. Recommender requests already in the tracker --------------------
  if (input.recommendations.outstanding > 0) {
    const days = soonest?.daysRemaining ?? null;
    add({
      id: "recommendations",
      titleKey: "recommendationsOutstanding",
      detailKey: "recommendationsReview",
      values: { count: input.recommendations.outstanding },
      dueInDays: days,
      tab: "recommendations",
      score: baseScore(days) + 10,
    });
  }

  // ---- 4. University-level test figure: verify before acting -------------
  const catalogueSignal = input.gaps.find(
    (gap) => gap.catalogueFigure != null && (gap.state === "below_figure" || gap.state === "no_score"),
  );
  if (catalogueSignal) {
    add({
      id: `test-policy-${catalogueSignal.testType}`,
      titleKey: "testPolicyVerify",
      detailKey: catalogueSignal.current == null ? "testPolicyNoScore" : "testPolicyCompare",
      values: {
        test: catalogueSignal.testType,
        ...(catalogueSignal.current == null ? {} : { current: catalogueSignal.current }),
        figure: catalogueSignal.catalogueFigure!,
      },
      dueInDays: null,
      tab: "tests",
      score: 56,
    });
  } else if (input.tests.target != null && input.tests.ielts != null && input.tests.ielts < input.tests.target) {
    add({
      id: "test-personal-target",
      titleKey: "personalTestTarget",
      detailKey: "personalTestTargetReview",
      values: { current: input.tests.ielts, target: input.tests.target },
      dueInDays: null,
      tab: "tests",
      score: 46,
    });
  }

  // ---- 5. Documents in the student's vault -------------------------------
  if (input.documents.expiring > 0) {
    add({
      id: "documents-expiring",
      titleKey: "documentsExpiring",
      detailKey: "documentsValidity",
      values: { count: input.documents.expiring },
      dueInDays: null,
      tab: "documents",
      score: 54,
    });
  } else if (input.documents.total > 0 && input.documents.ready < input.documents.total) {
    add({
      id: "documents-review",
      titleKey: "documentsNeedReview",
      detailKey: "documentsOfficialChecklist",
      values: { count: input.documents.total - input.documents.ready },
      dueInDays: null,
      tab: "documents",
      score: 44,
    });
  }

  // ---- 6. Cost estimate and recorded funding -----------------------------
  if (input.funding && !input.funding.covered && input.funding.gap > 0) {
    add({
      id: "funding-gap",
      titleKey: "fundingGap",
      detailKey: "fundingGapReview",
      values: { amount: input.funding.gap },
      dueInDays: null,
      tab: "funding",
      score: 60,
    });
  }

  // ---- 7. Journey-specific context ---------------------------------------
  for (const need of input.journey.stillNeeded) {
    add({
      id: `stage-${input.journey.current}-${need.tab}`,
      titleKey: "",
      rawTitle: need.text,
      rawTitleKind: "journey",
      detailKey: "journeyStageStep",
      dueInDays: null,
      tab: need.tab || stageTab(input.journey.current),
      score: 40,
    });
  }

  // ---- 8. A neutral entry point when no tracked work is due ---------------
  if (steps.length === 0) {
    add({
      id: "start",
      titleKey: "studyPlanStart",
      detailKey: "studyPlanStartDetail",
      dueInDays: null,
      tab: "study-plan",
      score: 20,
    });
  }

  return dedupeRanked(
    rankActions(steps),
    (step) => step.rawTitle ?? `${step.titleKey}:${JSON.stringify(step.values ?? {})}`,
  ).slice(0, limit);
}

function labelFor(testType: string): string {
  switch (testType) {
    case "ielts":
      return "IELTS";
    case "toefl":
      return "TOEFL";
    case "sat":
      return "SAT";
    case "act":
      return "ACT";
    case "duolingo":
      return "Duolingo English Test";
    default:
      return testType.toUpperCase();
  }
}

function stageTab(stage: string): string {
  switch (stage) {
    case "discover":
      return "universities";
    case "match":
      return "chancing";
    case "prepare":
      return "documents";
    case "apply":
      return "applications";
    case "accepted":
      return "offers";
    case "fund":
      return "funding";
    case "visa":
      return "visa";
    case "depart":
      return "departure";
    default:
      return "dashboard";
  }
}
