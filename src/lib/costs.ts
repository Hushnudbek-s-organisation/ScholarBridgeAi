/**
 * Cost Calculator + Scholarship Portfolio (Phase 3).
 *
 * The question a student actually has is not "what is the tuition?" but "can my
 * family afford this, and what would I still owe after every scholarship I
 * could plausibly win?" Tuition is only one part of the cost. Every amount
 * below is either explicitly known in USD or remains unknown; this module does
 * not fill missing budget lines with zeroes or generic cost estimates.
 *
 * Pure module — asserted in `scripts/check-costs.ts`.
 *
 * The known-value, rounding, summing and period primitives are imported from
 * the ONE canonical `financeModel.ts` that `budgetFit.ts` (the concise verdict
 * shown on cards, compare and recommender) also imports. This is what makes the
 * detailed plan and the concise verdict use a single calculation model.
 */

import { normalizeScholarshipAwardPeriod } from "./usdCosts";
import {
  knownMoney,
  roundMoney,
  sumKnown as canonicalSumKnown,
  classifyAid,
  usableUpfrontAid,
  type AidKind,
} from "./financeModel";

export interface CostInputs {
  /** Published by the university; null means unknown. */
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  accommodationCostUsd?: number | null;
  applicationFeeUsd?: number | null;
  country?: string | null;
  city?: string | null;
  /** Years in the programme. */
  years?: number | null;
  /** One-off and recurring extras the student tells us about. */
  flightsPerYearUsd?: number | null;
  insurancePerYearUsd?: number | null;
  booksPerYearUsd?: number | null;
  visaFeeUsd?: number | null;
  /** Scholarships the student is actually going to apply to. */
  scholarships?: ScholarshipInput[];
  /** What the family can contribute per year; income is not a contribution. */
  familyContributionUsd?: number | null;
}

export interface ScholarshipInput {
  status?: "saved" | "applied" | "conditional" | "awarded" | "paid" | "rejected";
  stacking?: "stackable" | "exclusive" | "unknown";
  fundingYears?: number | null;
  paymentMonths?: number | null;
  name: string;
  /** Resolved award value in USD; null means unknown or unsupported currency. */
  amountUsd: number | null;
  /** Catalogue award period; annual calculations require a supported period. */
  awardPeriod?: string | null;
  /** What it actually covers — a stipend does not pay tuition. */
  covers: "tuition" | "living" | "both" | "other";
  /** Catalogue award basis / coverage wording, used to classify aid kind. */
  basis?: string | null;
  /** Explicit catalogue flag: a loan must never reduce net cost. */
  repayable?: boolean | null;
  /** Explicit catalogue flag: a reimbursement cannot pay an upfront bill. */
  reimbursement?: boolean | null;
  /** Days until the date listed by the catalogue, when available. */
  deadlineDays?: number | null;
}

export interface CostLine {
  key: string;
  label: string;
  /** Annual recurring amount, or null when not resolved. */
  annualUsd: number | null;
  /** Whole-programme amount, or null when amount/duration is unknown. */
  totalUsd: number | null;
  frequency: "annual" | "one_time";
  /** Kept for explicitly sourced estimates; unknown values are not estimates. */
  estimated: boolean;
}

export interface CostBreakdown {
  lines: CostLine[];
  /** Null unless every included recurring cost line is known. */
  annualTotalUsd: number | null;
  /** Null unless every included cost line and programme duration is known. */
  totalUsd: number | null;
  /** Missing, unsupported, or not-yet-verified inputs the student should check. */
  unknowns: string[];
  scholarship: {
    /** Best-case recurring awards in annual USD; null if any relevant award is unknown. */
    bestCaseAnnualUsd: number | null;
    confirmedAnnualUsd: number | null;
    conditionalAnnualUsd: number | null;
    /** Best-case non-recurring awards across the programme; null if unresolved. */
    bestCaseOneTimeUsd: number | null;
    coveragePct: number | null;
    /** Scholarships that pay for something other than the shortfall. */
    misaligned: string[];
    /**
     * Field-level aid classification from the ONE canonical `financeModel`:
     * grant / repayable_loan / tuition_waiver / cash_stipend / reimbursement /
     * unknown are kept distinct. This is what stops a loan or a reimbursement
     * from being presented as a reduction in what a family must pay up front.
     */
    byKind: { name: string; kind: AidKind; note: string; countsTowardNetCost: boolean }[];
  };
  net: {
    annualAfterScholarshipUsd: number | null;
    totalAfterScholarshipUsd: number | null;
    familyContributionUsd: number | null;
    familyContributionKnown: boolean;
    /** Known need after scholarships and any explicitly confirmed contribution. */
    gapAnnualUsd: number | null;
    gapTotalUsd: number | null;
    /** Unknown until annual and whole-programme costs plus explicit support are known. */
    affordable: boolean | null;
  };
  /** One-line verdict, honest about uncertainty and unconfirmed family support. */
  verdict: string;
}

const MAX_YEARS = 10;
// Canonical known-value / rounding / sum semantics, imported from the ONE
// finance model that `budgetFit.ts` also uses. This removes the duplicated
// definitions that previously let the plan and the verdict disagree.
const money = roundMoney;
const knownNonNegative = knownMoney;

function programmeYears(value: number | null | undefined): number | null {
  const years = knownNonNegative(value);
  return years != null && years > 0 && years <= MAX_YEARS ? years : null;
}

function sumKnown(values: (number | null)[]): number | null {
  return canonicalSumKnown(values);
}

function annualLine(key: string, label: string, amount: number | null, years: number | null): CostLine {
  return {
    key,
    label,
    annualUsd: amount == null ? null : money(amount),
    totalUsd: amount == null || years == null ? null : money(amount * years),
    frequency: "annual",
    estimated: false,
  };
}

function oneTimeLine(key: string, label: string, amount: number | null): CostLine {
  return {
    key,
    label,
    annualUsd: null,
    totalUsd: amount == null ? null : money(amount),
    frequency: "one_time",
    estimated: false,
  };
}

type ScopedAward = { amount: number; covers: ScholarshipInput["covers"]; confirmed: boolean; conditional?: boolean; stacking?: ScholarshipInput["stacking"]; fundingYears?: number | null };
function allocatedAid(awards: ScopedAward[], tuition: number | null, living: number | null): number | null {
  if (awards.length > 1 && awards.some(a=>a.stacking !== "stackable")) return null;
  if (awards.some(a => (a.covers === "tuition" && tuition == null) || (a.covers === "living" && living == null) || (a.covers === "both" && (tuition == null || living == null)))) return null;
  return usableUpfrontAid(awards.map((a,i)=>({...classifyAid({key:String(i),basis:"grant",covers:a.covers,amountUsd:a.amount,period:"year"}),annualUsd:a.amount})), {tuitionAnnualUsd:tuition,livingAnnualUsd:living}).totalUsd;
}

export function calculateCosts(input: CostInputs): CostBreakdown {
  const years = programmeYears(input.years);
  const unknowns: string[] = [];
  const addUnknown = (message: string) => unknowns.push(message);

  const tuition = knownNonNegative(input.annualTuitionUsd);
  const living = knownNonNegative(input.annualLivingEstUsd);
  const accommodation = knownNonNegative(input.accommodationCostUsd);
  const insurance = knownNonNegative(input.insurancePerYearUsd);
  const books = knownNonNegative(input.booksPerYearUsd);
  const flights = knownNonNegative(input.flightsPerYearUsd);
  const visaFee = knownNonNegative(input.visaFeeUsd);
  const applicationFee = knownNonNegative(input.applicationFeeUsd);

  if (tuition == null) addUnknown("Annual tuition is unknown or unavailable in USD.");
  if (living == null) addUnknown("Annual living costs are unknown or unavailable in USD.");
  if (insurance == null) addUnknown("Annual health insurance cost is unknown.");
  if (books == null) addUnknown("Annual books and materials cost is unknown.");
  if (flights == null) addUnknown("Annual travel cost is unknown.");
  if (visaFee == null) addUnknown("Visa or residence-permit fees are unknown; check official government guidance.");
  if (applicationFee == null) addUnknown("Application fees are unknown; check each official programme page.");
  if (years == null) {
    addUnknown(`Programme duration is unknown or outside the supported 1–${MAX_YEARS} year range; whole-programme totals are unavailable.`);
  }

  const lines: CostLine[] = [
    annualLine("tuition", "Tuition", tuition, years),
    annualLine("living", "Living (food, transport, phone)", living, years),
  ];

  // Accommodation may be added separately only when the published living line
  // is absent. If published living is present, assume it already includes
  // accommodation and avoid double-counting it.
  if (living == null && input.accommodationCostUsd != null) {
    if (accommodation == null) addUnknown("Separately listed accommodation cost is not a valid non-negative USD amount.");
    lines.push(annualLine("accommodation", "Accommodation (published separately)", accommodation, years));
  }

  lines.push(
    annualLine("insurance", "Health insurance", insurance, years),
    annualLine("books", "Books & materials", books, years),
    annualLine("flights", "Flights home", flights, years),
    oneTimeLine("visa_fee", "Visa or residence-permit fee", visaFee),
    oneTimeLine("application_fee", "Application fee", applicationFee)
  );

  const annualLines = lines.filter((line) => line.frequency === "annual");
  const annualTotal = sumKnown(annualLines.map((line) => line.annualUsd));
  const totalCost = sumKnown(lines.map((line) => line.totalUsd));

  // Keep annual and one-time awards separate. Monthly awards can be annualized
  // without an invented duration; unsupported or absent periods remain unknown.
  const annualAwards: ScopedAward[] = [];
  const oneTimeAwards: ScopedAward[] = [];
  let annualAwardUnknown = false;
  let oneTimeAwardUnknown = false;
  // Field-level aid classification from the canonical finance model. Loans and
  // reimbursements are real awards but NEVER a reduction in what a family must
  // pay up front; they are recorded separately, not summed into best-case aid.
  const byKind: { name: string; kind: AidKind; note: string; countsTowardNetCost: boolean }[] = [];
  for (const award of input.scholarships ?? []) {
    const classified = classifyAid({
      key: award.name,
      basis: award.basis,
      covers: award.covers,
      repayable: award.repayable,
      reimbursement: award.reimbursement,
      amountUsd: award.amountUsd,
      period: award.awardPeriod,
      paymentMonths: award.paymentMonths,
    });
    const excluded = classified.repayable || classified.kind === "reimbursement";
    byKind.push({
      name: award.name,
      kind: classified.kind,
      note: classified.note,
      countsTowardNetCost: !excluded && (award.status === "awarded" || award.status === "paid"),
    });
    if (award.status === "rejected") continue;
    if (excluded || classified.kind === "unknown") {
      // A repayable loan / after-the-fact reimbursement cannot cover an upfront
      // bill. Report it honestly instead of silently folding it into "funding".
      addUnknown(`${award.name}: ${classified.note}`);
      continue;
    }
    const period = normalizeScholarshipAwardPeriod(award.awardPeriod);
    const amount = knownNonNegative(award.amountUsd);
    if (period === "year" || period === "month") {
      if (amount == null) {
        annualAwardUnknown = true;
        addUnknown(`${award.name} has no resolved non-negative USD award amount.`);
        continue;
      }
      if (period === "month" && !(award.paymentMonths && award.paymentMonths > 0 && award.paymentMonths <= 12)) { addUnknown(`${award.name}: payment months are unknown.`); annualAwardUnknown = true; continue; }
      annualAwards.push({ amount: period === "month" ? amount * award.paymentMonths! : amount, covers: award.covers, confirmed: award.status === "awarded" || award.status === "paid", conditional: award.status === "conditional", stacking: award.stacking, fundingYears: award.fundingYears });
    } else if (period === "one_time" || period === "total") {
      if (amount == null) {
        oneTimeAwardUnknown = true;
        addUnknown(`${award.name} has no resolved non-negative USD award amount.`);
        continue;
      }
      oneTimeAwards.push({ amount, covers: award.covers, confirmed: award.status === "awarded" || award.status === "paid", conditional: award.status === "conditional", stacking: award.stacking });
    } else {
      annualAwardUnknown = true;
      oneTimeAwardUnknown = true;
      addUnknown(`${award.name} has an unknown or unsupported award period, so it cannot be compared with the annual budget.`);
    }
  }

  const knownAnnualScholarship = allocatedAid(annualAwards, tuition, living);
  const knownOneTimeScholarship = allocatedAid(oneTimeAwards, tuition == null || years == null ? null : tuition * years, living == null || years == null ? null : living * years);
  const bestCaseAnnual = annualAwardUnknown ? null : knownAnnualScholarship;
  const bestCaseOneTime = oneTimeAwardUnknown ? null : knownOneTimeScholarship;
  const coveragePct = annualTotal != null && annualTotal > 0 && bestCaseAnnual != null
    ? Math.round(Math.min(100, (bestCaseAnnual / annualTotal) * 100))
    : null;

  const confirmedAnnual = allocatedAid(annualAwards.filter(a=>a.confirmed), tuition, living);
  const durationUnknown = annualAwards.some(a=>a.confirmed && years != null && years > 1 && a.fundingYears == null);
  const confirmedProgrammeAid = years == null ? null : allocatedAid([...annualAwards.filter(a=>a.confirmed).map(a=>({...a,amount:a.amount * Math.min(years,a.fundingYears ?? 1)})),...oneTimeAwards.filter(a=>a.confirmed)], tuition == null ? null : tuition * years, living == null ? null : living * years);
  if (knownAnnualScholarship == null || knownOneTimeScholarship == null) addUnknown("Award stacking rules are unknown; scenarios cannot assume all awards combine.");
  const annualAfterScholarship = annualTotal == null || confirmedAnnual == null
    ? null
    : money(Math.max(0, annualTotal - confirmedAnnual));
  const totalAfterScholarship = totalCost == null || years == null || confirmedProgrammeAid == null || durationUnknown
    ? null
    : money(Math.max(0, totalCost - confirmedProgrammeAid));

  const family = knownNonNegative(input.familyContributionUsd);
  const familyContributionKnown = family != null;
  const gapAnnual = annualAfterScholarship == null
    ? null
    : familyContributionKnown
      ? money(Math.max(0, annualAfterScholarship - family))
      : annualAfterScholarship;
  const gapTotal = totalAfterScholarship == null || years == null
    ? null
    : familyContributionKnown
      ? money(Math.max(0, totalAfterScholarship - family! * years))
      : totalAfterScholarship;
  const affordable = familyContributionKnown && gapAnnual != null && gapTotal != null
    ? gapAnnual <= 0 && gapTotal <= 0
    : null;

  const misaligned: string[] = [];
  const hasTuitionAid = annualAwards.some((award) => award.covers === "tuition" || award.covers === "both");
  if (tuition != null && tuition > 0 && !hasTuitionAid) {
    for (const award of annualAwards.filter((entry) => entry.covers === "living")) {
      misaligned.push(`${award.amount.toLocaleString("en-US")} USD/year of living aid does not pay the ${tuition.toLocaleString("en-US")} USD tuition.`);
    }
  }

  let verdict: string;
  if (annualTotal == null) {
    verdict = "Some annual cost lines are unknown or unavailable in USD. A full annual total and funding gap cannot be calculated until those amounts are verified.";
  } else if (bestCaseAnnual == null || annualAfterScholarship == null) {
    verdict = "At least one saved award has an unknown amount or unsupported period, so annual scholarship coverage and the funding gap remain unknown.";
  } else if (!familyContributionKnown) {
    verdict = `Known annual costs leave ${annualAfterScholarship.toLocaleString("en-US")} USD/year before any unconfirmed family contribution. Add only an amount your family has explicitly confirmed; family income is not counted as available funding.`;
  } else if (gapAnnual != null && gapAnnual <= 0 && gapTotal == null) {
    verdict = "Known annual costs appear covered by the recorded awards and explicit contribution, but whole-programme affordability remains unknown because duration, one-off costs, or award totals are unresolved.";
  } else if (gapAnnual != null && gapAnnual <= 0 && gapTotal != null && gapTotal <= 0) {
    verdict = `On paper, confirmed annual family support covers the ${annualAfterScholarship.toLocaleString("en-US")} USD remaining after scholarships. Only awarded/paid support is counted; saved opportunities are not secured funding.`;
  } else {
    verdict = `The annual funding gap is ${gapAnnual?.toLocaleString("en-US") ?? "unknown"} USD after confirmed contribution. Verify award conditions and any unknown cost lines before relying on this result.`;
  }

  return {
    lines,
    annualTotalUsd: annualTotal,
    totalUsd: totalCost,
    unknowns,
    scholarship: {
      bestCaseAnnualUsd: bestCaseAnnual,
      confirmedAnnualUsd: confirmedAnnual,
      conditionalAnnualUsd: allocatedAid(annualAwards.filter(a=>a.confirmed||a.conditional),tuition,living),
      bestCaseOneTimeUsd: bestCaseOneTime,
      coveragePct,
      misaligned,
      byKind,
    },
    net: {
      annualAfterScholarshipUsd: annualAfterScholarship,
      totalAfterScholarshipUsd: totalAfterScholarship,
      familyContributionUsd: family,
      familyContributionKnown,
      gapAnnualUsd: gapAnnual,
      gapTotalUsd: gapTotal,
      affordable,
    },
    verdict,
  };
}

/**
 * Student-facing scholarship review based on saved catalogue facts. It does not
 * infer award probability, recommend a universal application count, or treat a
 * saved scholarship as secured funding.
 */
export interface PortfolioInputs {
  scholarships: ScholarshipInput[];
}

export type PortfolioAdviceKey =
  | "noSavedAwards"
  | "unconfirmedAwards"
  | "missingAmounts"
  | "deadlinesPassed"
  | "deadlinesUpcoming";

export interface PortfolioAdviceItem {
  key: PortfolioAdviceKey;
  count?: number;
}

export interface PortfolioAdvice {
  count: number;
  advice: PortfolioAdviceItem[];
}

export function assessPortfolio(input: PortfolioInputs): PortfolioAdvice {
  const list = input.scholarships;
  const advice: PortfolioAdviceItem[] = [];

  advice.push({ key: list.length === 0 ? "noSavedAwards" : "unconfirmedAwards" });

  const missingAmounts = list.filter((s) => s.amountUsd == null || !Number.isFinite(s.amountUsd) || s.amountUsd < 0).length;
  if (missingAmounts > 0) advice.push({ key: "missingAmounts", count: missingAmounts });

  const overdue = list.filter((s) => s.deadlineDays != null && s.deadlineDays < 0).length;
  if (overdue > 0) advice.push({ key: "deadlinesPassed", count: overdue });

  const upcoming = list.filter((s) => s.deadlineDays != null && s.deadlineDays >= 0 && s.deadlineDays <= 30).length;
  if (upcoming > 0) advice.push({ key: "deadlinesUpcoming", count: upcoming });

  return { count: list.length, advice };
}
