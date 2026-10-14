/**
 * The Study Abroad Journey — the spine of the whole product (spec §1).
 *
 *   DISCOVER → MATCH → PREPARE → APPLY → TRACK → ACCEPTED → FUND → VISA → DEPART
 *
 * The sidebar splits that into 8 groups, but the *student-facing* bar shows
 * 8 stages: `track` is folded into `apply` (the applications tracker IS the
 * tracking) and `fund` keeps its own stage because spec §24 needs a home after
 * acceptance.
 *
 * PURE MODULE. No DB, no AI, no clock reads — the current stage is *derived*
 * from the student's own rows on every request, so it can never drift from
 * reality, and the ordering can be asserted in `scripts/check-journey.ts`.
 */

export type JourneyStageId =
  | "discover"
  | "match"
  | "prepare"
  | "apply"
  | "accepted"
  | "fund"
  | "visa"
  | "depart";

export interface JourneyStage {
  id: JourneyStageId;
  /** Short label for the progress bar. */
  label: string;
  /** Emoji used on the bar + the dashboard hero. */
  icon: string;
  /** Which sidebar group the section for this stage lives in. */
  group: "discover" | "journey" | "prepare" | "apply" | "after";
  /** The section the "Continue" button opens. */
  tab: string;
  /** One line explaining what "done" means for this stage. */
  doneWhen: string;
}

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  {
    id: "discover",
    label: "Discover",
    icon: "🔎",
    group: "discover",
    tab: "universities",
    doneWhen: "You have recorded some profile context. Add only details you choose to share; verify programme rules separately.",
  },
  {
    id: "match",
    label: "Match",
    icon: "🎯",
    group: "journey",
    tab: "chancing",
    doneWhen: "You have saved universities and can review the available profile-to-catalogue comparisons.",
  },
  {
    id: "prepare",
    label: "Prepare",
    icon: "📋",
    group: "prepare",
    tab: "documents",
    doneWhen: "You have started a programme application and saved a programme to compare; check official requirements separately.",
  },
  {
    id: "apply",
    label: "Apply",
    icon: "📝",
    group: "apply",
    tab: "workspace",
    doneWhen: "At least one application is submitted.",
  },
  {
    id: "accepted",
    label: "Accepted",
    icon: "🎓",
    group: "after",
    tab: "offers",
    doneWhen: "You recorded an offer and decided what to do about it.",
  },
  {
    id: "fund",
    label: "Fund",
    icon: "💰",
    group: "after",
    tab: "funding",
    doneWhen: "You have recorded funding information and reviewed any remaining estimate with its source.",
  },
  {
    id: "visa",
    label: "Visa",
    icon: "🛂",
    group: "after",
    tab: "visa",
    doneWhen: "You have recorded a visa decision if one applies to your destination; this app does not verify immigration status.",
  },
  {
    id: "depart",
    label: "Depart",
    icon: "✈️",
    group: "after",
    tab: "departure",
    doneWhen: "You are enrolled and ready to fly.",
  },
] as const;

/**
 * Raw counts the stage engine needs. Everything is optional so a brand-new
 * account (all zeros) still produces a sensible stage: `discover`.
 */
export interface JourneyCounts {
  /** Some voluntary profile context is recorded; not a completeness or quality score. */
  profileHasContext: boolean;
  savedUniversities: number;
  applications: number;
  submittedApplications: number;
  offersRecorded: number;
  acceptedOffers: number;
  fundingPlanTotal: number;
  fundingGapClosed: boolean;
  visaCaseStarted: boolean;
  visaApproved: boolean;
  departureReady: boolean;
}

export const EMPTY_JOURNEY_COUNTS: JourneyCounts = {
  profileHasContext: false,
  savedUniversities: 0,
  applications: 0,
  submittedApplications: 0,
  offersRecorded: 0,
  acceptedOffers: 0,
  fundingPlanTotal: 0,
  fundingGapClosed: false,
  visaCaseStarted: false,
  visaApproved: false,
  departureReady: false,
};

export interface JourneyStageResult {
  /** The stage the student is working in right now. */
  current: JourneyStageId;
  currentLabel: string;
  currentIcon: string;
  /** The tab the "Continue" button should open. */
  continueTab: string;
  /** Whole-journey completion, 0–100. Weighted so early work still counts. */
  progressPct: number;
  /** The next stage after the current one (null once fully complete). */
  next: JourneyStageId | null;
  /** What is still missing in the CURRENT stage, with where to go for it. */
  stillNeeded: { text: string; tab: string }[];
  stages: (JourneyStage & { done: boolean; current: boolean })[];
}

/** Per-stage completion, 0–1. A stage is only "done" at 1. */
export function stageCompletion(c: JourneyCounts): Record<JourneyStageId, number> {
  return {
    discover: c.profileHasContext ? 1 : 0,
    match: c.savedUniversities > 0 ? 1 : 0,
    prepare:
      (c.applications > 0 ? 0.65 : 0) +
      (c.savedUniversities > 0 ? 0.35 : 0),
    apply: c.submittedApplications > 0 ? 1 : c.applications > 0 ? 0.6 : 0,
    accepted: c.acceptedOffers > 0 ? 1 : c.offersRecorded > 0 ? 0.6 : 0,
    fund: c.fundingPlanTotal > 0 ? (c.fundingGapClosed ? 1 : 0.5) : 0,
    visa: c.visaApproved ? 1 : c.visaCaseStarted ? 0.5 : 0,
    depart: c.departureReady ? 1 : 0,
  };
}

/**
 * The current stage = the FIRST stage that is not complete.
 * A journey with no data at all is in `discover`, never in `depart`.
 */
export function currentStage(c: JourneyCounts): JourneyStageId {
  const done = stageCompletion(c);
  for (const stage of JOURNEY_STAGES) {
    if (done[stage.id] < 1) return stage.id;
  }
  return "depart";
}

/**
 * Plain-language "what is still missing here" — always non-empty while the
 * stage is incomplete, and always paired with the section that fixes it, so a
 * [Continue] button is never a dead end.
 */
export function stageStillNeeded(stage: JourneyStageId, c: JourneyCounts): { text: string; tab: string }[] {
  switch (stage) {
    case "discover":
      return c.profileHasContext ? [] : [{ text: "Add any profile context you choose to record for more specific programme comparisons", tab: "profile/details" }];
    case "match":
      return c.savedUniversities === 0
        ? [{ text: "Save a programme you are considering, then verify its details on the official page", tab: "universities" }]
        : [];
    case "prepare":
      return [
        ...(c.applications === 0 ? [{ text: "Add an application to track when you are ready", tab: "applications" }] : []),
        ...(c.savedUniversities === 0 ? [{ text: "Save a programme you want to compare", tab: "universities" }] : []),
      ];
    case "apply":
      return c.applications === 0
        ? [{ text: "Add an application when you are ready to track one", tab: "applications" }]
        : c.submittedApplications === 0
          ? [{ text: "Review the official checklist and submission steps for your tracked application", tab: "workspace" }]
          : [];
    case "accepted":
      return c.offersRecorded === 0
        ? [{ text: "Record the offers you receive", tab: "offers" }]
        : c.acceptedOffers === 0
          ? [{ text: "Decide on the offers you received", tab: "offers" }]
          : [];
    case "fund":
      return c.fundingPlanTotal === 0
        ? [{ text: "Record how you plan to cover study costs, if relevant", tab: "funding" }]
        : c.fundingGapClosed
          ? []
          : [{ text: "Review recorded amounts, conditions and any estimated funding gap", tab: "funding" }];
    case "visa":
      return c.visaApproved
        ? []
        : c.visaCaseStarted
          ? [{ text: "Check current official immigration instructions for your destination", tab: "visa" }]
          : [{ text: "Review official immigration guidance when you know your destination and institution", tab: "visa" }];
    case "depart":
      return c.departureReady ? [] : [{ text: "Complete the departure checklist", tab: "departure" }];
  }
}

/**
 * Whole-journey progress. Deliberately simple and explainable: the mean of the
 * eight stage completions. It is NOT a probability of admission.
 */
export function journeyProgress(c: JourneyCounts): number {
  const done = stageCompletion(c);
  const total = JOURNEY_STAGES.reduce((sum, s) => sum + done[s.id], 0);
  return Math.round((total / JOURNEY_STAGES.length) * 100);
}

export function resolveJourney(c: JourneyCounts): JourneyStageResult {
  const done = stageCompletion(c);
  const current = currentStage(c);
  const idx = JOURNEY_STAGES.findIndex((s) => s.id === current);
  return {
    current,
    currentLabel: JOURNEY_STAGES[idx]?.label ?? "Discover",
    currentIcon: JOURNEY_STAGES[idx]?.icon ?? "🔎",
    continueTab: JOURNEY_STAGES[idx]?.tab ?? "dashboard",
    progressPct: journeyProgress(c),
    next: idx >= 0 && idx < JOURNEY_STAGES.length - 1 ? JOURNEY_STAGES[idx + 1].id : null,
    stillNeeded: stageStillNeeded(current, c),
    stages: JOURNEY_STAGES.map((s) => ({
      ...s,
      done: done[s.id] >= 1,
      current: s.id === current,
    })),
  };
}
