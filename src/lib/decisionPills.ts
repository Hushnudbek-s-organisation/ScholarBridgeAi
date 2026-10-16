/**
 * Priority 4.1 — the one-glance decision strip on every university.
 *
 * An ordinary directory shows a student a table of numbers and leaves the
 * arithmetic to them. This engine does the three comparisons that actually
 * decide whether a university is worth an application fee, and returns them as
 * structured pills the UI renders identically in the explorer, the detail view
 * and the compare sheet:
 *
 *   1. Academic eligibility — GPA and IELTS against the university's published
 *      minimums, on a comparable scale, with the exact shortfall.
 *   2. Budget versus tuition — the published tuition against the budget the
 *      student recorded, with the annual gap in USD.
 *   3. Post-study work visa — the published years of stay-after-graduation.
 *
 * HONESTY RULES (spec §16 / §19 — the ones the catalogue APIs already follow)
 * --------------------------------------------------------------------------
 *  • NULL is never zero and never a pass. A university that publishes no IELTS
 *    minimum yields `not_published`; a student who has not entered a GPA yields
 *    `unknown`. Neither becomes a green tick.
 *  • GPA is compared through `gpaTo40Scale`, which refuses to guess a scale: an
 *    85 with no scale is unknown, not 4.0 and not a failure.
 *  • IELTS and TOEFL are never cross-converted. A student with only a TOEFL
 *    score gets `unknown` against an IELTS minimum, plus the reason.
 *  • The budget pill compares tuition with the student's own annual budget and
 *    says so; it does not claim to know their net cost after aid.
 *  • Pure and deterministic — no network, no AI, no Date.now().
 */

import { gpaTo40Scale } from "./gpa";

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

export interface DecisionUniversityInput {
  id?: number | null;
  name?: string | null;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  postStudyWorkVisaYears?: number | null;
  country?: string | null;
}

export interface DecisionProfileInput {
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  budgetAnnualUsd?: number | null;
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

export type PillTone = "positive" | "caution" | "negative" | "neutral";

/** Why one requirement is or is not met. */
export type GapReason =
  | "met"
  | "not_met"
  | "unknown_profile"
  | "not_published"
  | "different_test";

export interface RequirementGap {
  requirement: "gpa" | "ielts" | "sat";
  reason: GapReason;
  /** The student's value on the comparison scale (null = not provided). */
  mine: number | null;
  /** The university's published minimum (null = not published). */
  required: number | null;
  /** Positive = how much more the student needs. Null when not comparable. */
  shortfall: number | null;
  /** Text ready to print, already on the comparison scale. */
  mineText: string | null;
  requiredText: string | null;
}

export interface DecisionPill {
  id: "eligibility" | "budget" | "workVisa";
  tone: PillTone;
  /** i18n key suffix: `university.pills.<id>.<stateKey>`. */
  stateKey: string;
  /** ICU values for that message. */
  params: Record<string, string | number>;
  /** Longer explanation for the pill's `title` attribute. */
  hintKey: string;
  hintParams: Record<string, string | number>;
}

export interface BudgetComparison {
  tuitionUsd: number | null;
  budgetUsd: number | null;
  livingUsd: number | null;
  /** tuition − budget, positive when the student is short. */
  gapUsd: number | null;
  withinBudget: boolean | null;
}

export interface UniversityDecision {
  pills: DecisionPill[];
  gaps: { gpa: RequirementGap; ielts: RequirementGap; sat: RequirementGap };
  /** Overall academic verdict across the published requirements. */
  eligibility: "met" | "partial" | "not_met" | "unknown";
  budget: BudgetComparison;
  workVisaYears: number | null;
  /** True when at least one pill carries a real, personalised verdict. */
  personalised: boolean;
}

/* -------------------------------------------------------------------------- */
/* Requirement comparisons                                                     */
/* -------------------------------------------------------------------------- */

function num(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** GPA on the 4.0 scale, with the exact shortfall against a published minimum. */
export function compareGpa(
  profile: DecisionProfileInput,
  university: DecisionUniversityInput
): RequirementGap {
  const required = num(university.minGpa);
  const mine = gpaTo40Scale(profile.gpa, profile.gpaScale);

  if (required == null) {
    return {
      requirement: "gpa",
      reason: "not_published",
      mine,
      required: null,
      shortfall: null,
      mineText: mine != null ? mine.toFixed(2) : null,
      requiredText: null,
    };
  }
  // A published minimum that is not on a 4.0 scale cannot be compared to a
  // normalized 4.0 GPA; treat it as unknown rather than inventing a conversion.
  const requiredOn4 = gpaTo40Scale(required, required > 4 ? null : 4);
  if (requiredOn4 == null) {
    return {
      requirement: "gpa",
      reason: "not_published",
      mine,
      required: null,
      shortfall: null,
      mineText: mine != null ? mine.toFixed(2) : null,
      requiredText: null,
    };
  }
  if (mine == null) {
    return {
      requirement: "gpa",
      reason: "unknown_profile",
      mine: null,
      required: requiredOn4,
      shortfall: null,
      mineText: null,
      requiredText: requiredOn4.toFixed(2),
    };
  }
  const shortfall = round(requiredOn4 - mine, 2);
  return {
    requirement: "gpa",
    reason: shortfall > 0.001 ? "not_met" : "met",
    mine,
    required: requiredOn4,
    shortfall: shortfall > 0 ? shortfall : 0,
    mineText: mine.toFixed(2),
    requiredText: requiredOn4.toFixed(2),
  };
}

/** IELTS against IELTS only. A TOEFL-only student gets `different_test`. */
export function compareIelts(
  profile: DecisionProfileInput,
  university: DecisionUniversityInput
): RequirementGap {
  const required = num(university.minIelts);
  const mine = num(profile.ieltsScore);

  if (required == null) {
    return {
      requirement: "ielts",
      reason: "not_published",
      mine,
      required: null,
      shortfall: null,
      mineText: mine != null ? mine.toFixed(1) : null,
      requiredText: null,
    };
  }
  if (mine == null) {
    const hasOtherTest = num(profile.toeflScore) != null;
    return {
      requirement: "ielts",
      reason: hasOtherTest ? "different_test" : "unknown_profile",
      mine: null,
      required,
      shortfall: null,
      mineText: null,
      requiredText: required.toFixed(1),
    };
  }
  // IELTS bands move in 0.5 steps; a 0.25 shortfall is reported as the next
  // half band the student can actually book.
  const raw = required - mine;
  const shortfall = raw > 0 ? Math.ceil(raw * 2) / 2 : 0;
  return {
    requirement: "ielts",
    reason: raw > 0.001 ? "not_met" : "met",
    mine,
    required,
    shortfall,
    mineText: mine.toFixed(1),
    requiredText: required.toFixed(1),
  };
}

/** SAT against SAT (the catalogue publishes SAT minimums, not ACT). */
export function compareSat(
  profile: DecisionProfileInput,
  university: DecisionUniversityInput
): RequirementGap {
  const required = num(university.minSat);
  const mine = num(profile.satScore);
  if (required == null) {
    return {
      requirement: "sat",
      reason: "not_published",
      mine,
      required: null,
      shortfall: null,
      mineText: mine != null ? String(mine) : null,
      requiredText: null,
    };
  }
  if (mine == null) {
    return {
      requirement: "sat",
      reason: "unknown_profile",
      mine: null,
      required,
      shortfall: null,
      mineText: null,
      requiredText: String(required),
    };
  }
  const shortfall = Math.max(0, Math.round(required - mine));
  return {
    requirement: "sat",
    reason: shortfall > 0 ? "not_met" : "met",
    mine,
    required,
    shortfall,
    mineText: String(mine),
    requiredText: String(required),
  };
}

/* -------------------------------------------------------------------------- */
/* Budget                                                                      */
/* -------------------------------------------------------------------------- */

/** Published tuition versus the student's own annual budget. */
export function compareBudget(
  profile: DecisionProfileInput,
  university: DecisionUniversityInput
): BudgetComparison {
  const tuitionUsd = num(university.annualTuitionUsd);
  const budgetUsd = num(profile.budgetAnnualUsd);
  const livingUsd = num(university.annualLivingEstUsd);

  if (tuitionUsd == null || budgetUsd == null || budgetUsd <= 0) {
    return { tuitionUsd, budgetUsd, livingUsd, gapUsd: null, withinBudget: null };
  }
  const gapUsd = Math.round(tuitionUsd - budgetUsd);
  return { tuitionUsd, budgetUsd, livingUsd, gapUsd, withinBudget: gapUsd <= 0 };
}

/* -------------------------------------------------------------------------- */
/* The three pills                                                             */
/* -------------------------------------------------------------------------- */

function eligibilityPill(gpa: RequirementGap, ielts: RequirementGap, sat: RequirementGap): DecisionPill {
  const published = [gpa, ielts, sat].filter((g) => g.reason !== "not_published");
  if (published.length === 0) {
    return {
      id: "eligibility",
      tone: "neutral",
      stateKey: "notPublished",
      params: {},
      hintKey: "notPublishedHint",
      hintParams: {},
    };
  }

  // Which requirement is furthest from being met drives the pill's wording.
  const shortfalls = [ielts, gpa, sat].filter((g) => g.reason === "not_met");
  if (shortfalls.length > 0) {
    const worst = shortfalls[0];
    const tone: PillTone = worst.requirement === "sat" ? "caution" : "caution";
    return {
      id: "eligibility",
      tone,
      stateKey: `short_${worst.requirement}`,
      params: {
        shortfall: worst.requirement === "sat" ? Math.round(worst.shortfall ?? 0) : (worst.shortfall ?? 0),
        required: worst.requiredText ?? "",
        mine: worst.mineText ?? "",
      },
      hintKey: `short_${worst.requirement}Hint`,
      hintParams: { required: worst.requiredText ?? "", mine: worst.mineText ?? "" },
    };
  }

  const met = published.filter((g) => g.reason === "met");
  const unknown = published.filter((g) => g.reason === "unknown_profile" || g.reason === "different_test");

  if (met.length > 0 && unknown.length === 0) {
    return {
      id: "eligibility",
      tone: "positive",
      stateKey: met.length > 1 ? "allMet" : `met_${met[0].requirement}`,
      params: { count: met.length },
      hintKey: "allMetHint",
      hintParams: {},
    };
  }
  if (unknown.length > 0 && met.length === 0) {
    const first = unknown[0];
    return {
      id: "eligibility",
      tone: "neutral",
      stateKey: first.reason === "different_test" ? "differentTest" : `unknown_${first.requirement}`,
      params: { required: first.requiredText ?? "" },
      hintKey: first.reason === "different_test" ? "differentTestHint" : `unknown_${first.requirement}Hint`,
      hintParams: { required: first.requiredText ?? "" },
    };
  }
  // Some met, some not recorded yet: still useful, still incomplete.
  return {
    id: "eligibility",
    tone: "neutral",
    stateKey: "partiallyKnown",
    params: { met: met.length, unknown: unknown.length },
    hintKey: "partiallyKnownHint",
    hintParams: { met: met.length, unknown: unknown.length },
  };
}

function budgetPill(budget: BudgetComparison): DecisionPill {
  if (budget.tuitionUsd == null) {
    return {
      id: "budget",
      tone: "neutral",
      stateKey: "tuitionUnknown",
      params: {},
      hintKey: "tuitionUnknownHint",
      hintParams: {},
    };
  }
  if (budget.budgetUsd == null) {
    return {
      id: "budget",
      tone: "neutral",
      stateKey: "budgetUnknown",
      params: { tuition: budget.tuitionUsd },
      hintKey: "budgetUnknownHint",
      hintParams: { tuition: budget.tuitionUsd },
    };
  }
  if (budget.withinBudget === true) {
    const headroom = Math.max(0, Math.round((budget.gapUsd ?? 0) * -1));
    return {
      id: "budget",
      tone: "positive",
      stateKey: "within",
      params: { headroom },
      hintKey: "withinHint",
      hintParams: { tuition: budget.tuitionUsd, budget: budget.budgetUsd },
    };
  }
  return {
    id: "budget",
    tone: "caution",
    stateKey: "gap",
    params: { gap: Math.max(0, budget.gapUsd ?? 0) },
    hintKey: "gapHint",
    hintParams: { tuition: budget.tuitionUsd, budget: budget.budgetUsd },
  };
}

function workVisaPill(years: number | null): DecisionPill {
  if (years == null) {
    return {
      id: "workVisa",
      tone: "neutral",
      stateKey: "unknown",
      params: {},
      hintKey: "unknownHint",
      hintParams: {},
    };
  }
  return {
    id: "workVisa",
    tone: years >= 2 ? "positive" : "neutral",
    stateKey: "years",
    params: { years },
    hintKey: "yearsHint",
    hintParams: { years },
  };
}

/**
 * The three-pill decision strip for one university and one profile. Pass
 * `profile: null` for an anonymous visitor: every pill then reports what is
 * published and what needs a profile, and none of them pretends to a verdict.
 */
export function evaluateUniversityDecision(
  university: DecisionUniversityInput,
  profile: DecisionProfileInput | null | undefined
): UniversityDecision {
  const p = profile ?? {};
  const gaps = {
    gpa: compareGpa(p, university),
    ielts: compareIelts(p, university),
    sat: compareSat(p, university),
  };
  const budget = compareBudget(p, university);
  const workVisaYears = num(university.postStudyWorkVisaYears);

  const comparable = [gaps.gpa, gaps.ielts, gaps.sat].filter(
    (g) => g.reason === "met" || g.reason === "not_met"
  );
  const eligibility: UniversityDecision["eligibility"] = (() => {
    if (comparable.length === 0) return "unknown";
    const notMet = comparable.filter((g) => g.reason === "not_met").length;
    if (notMet === 0) return "met";
    if (notMet < comparable.length) return "partial";
    return "not_met";
  })();

  const pills = [
    eligibilityPill(gaps.gpa, gaps.ielts, gaps.sat),
    budgetPill(budget),
    workVisaPill(workVisaYears),
  ];

  return {
    pills,
    gaps,
    eligibility,
    budget,
    workVisaYears,
    // "Personalised" means at least one pill was compared with THIS student.
    // A post-study work visa length is a fact about the destination, not about
    // the reader, so it never makes the strip personalised on its own — an
    // anonymous visitor must be able to be told "these are not about you yet".
    personalised: comparable.length > 0 || (budget.tuitionUsd != null && budget.budgetUsd != null),
  };
}

/** Tailwind classes per tone, shared by every surface that renders a pill. */
export const DECISION_PILL_CLASS: Record<PillTone, string> = {
  positive:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  caution:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  negative:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};
