/**
 * Cost Calculator + Scholarship Portfolio (Phase 3).
 *
 * The question a student actually has is not "what is the tuition?" but "can my
 * family afford this, and what would I still owe after every scholarship I
 * could plausibly win?" Tuition is the smallest part of the number — living
 * costs, flights, insurance, visa fees and the deposit usually decide it.
 *
 * Every estimate is labelled as an estimate, and anything the university has
 * not published is said to be missing rather than silently assumed.
 *
 * Pure module — asserted in `scripts/check-costs.ts`.
 */

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
  /** What the family can contribute per year. */
  familyContributionUsd?: number | null;
}

export interface ScholarshipInput {
  name: string;
  /** Annual value in USD. */
  amountUsd: number;
  /** What it actually covers — a stipend does not pay tuition. */
  covers: "tuition" | "living" | "both" | "other";
  /** Probability the student wins it, 0–1. */
  probability: number;
  deadlineDays?: number | null;
}

export interface CostLine {
  key: string;
  label: string;
  annualUsd: number;
  totalUsd: number;
  /** True when the university has not published it and we are estimating. */
  estimated: boolean;
}

export interface CostBreakdown {
  lines: CostLine[];
  annualTotalUsd: number;
  totalUsd: number;
  /** Missing published data — the student should verify these. */
  unknowns: string[];
  scholarship: {
    guaranteedAnnualUsd: number;
    expectedAnnualUsd: number;
    bestCaseAnnualUsd: number;
    coveragePct: number;
    /** Scholarships that pay for something other than the shortfall. */
    misaligned: string[];
  };
  net: {
    annualAfterScholarshipUsd: number;
    totalAfterScholarshipUsd: number;
    familyContributionUsd: number;
    /** What is still unaccounted for. */
    gapAnnualUsd: number;
    gapTotalUsd: number;
    affordable: boolean;
  };
  /** One-line verdict, honest about the uncertainty. */
  verdict: string;
}

// --- Defaults, with their reasoning kept visible ---------------------------

/**
 * Where a university publishes nothing, these are used AND flagged as
 * estimates. Ranges are deliberately wide-band midpoints, not optimistic.
 */
const LIVING_BY_COUNTRY: { re: RegExp; usd: number; note: string }[] = [
  { re: /united states|usa/i, usd: 16000, note: "US campus living" },
  { re: /united kingdom|england|scotland/i, usd: 14000, note: "UK living" },
  { re: /canada/i, usd: 12000, note: "Canada living" },
  { re: /australia|new zealand/i, usd: 15000, note: "ANZ living" },
  { re: /germany/i, usd: 11000, note: "Germany living (blocked account ≈ €11k/yr)" },
  { re: /netherlands|belgium|austria|france/i, usd: 12500, note: "Western EU living" },
  { re: /sweden|norway|denmark|finland|iceland/i, usd: 13500, note: "Nordic living" },
  { re: /poland|hungary|czech|portugal|spain|italy|greece/i, usd: 8500, note: "Southern/Eastern EU living" },
  { re: /turkey|russia|kazakhstan|uzbekistan/i, usd: 5500, note: "regional living" },
  { re: /malaysia|china|japan|south korea|singapore/i, usd: 9500, note: "Asia living" },
];

const DEFAULT_LIVING_USD = 11000;
const DEFAULT_BOOKS_USD = 900;
const DEFAULT_INSURANCE_USD = 1200;
const DEFAULT_FLIGHTS_USD = 1400;
const DEFAULT_VISA_FEE_USD = 350;
const DEFAULT_YEARS = 4;

const money = (v: number) => Math.round(v);

function livingFor(country: string | null | undefined): { usd: number; note: string } {
  if (!country) return { usd: DEFAULT_LIVING_USD, note: "typical international student living costs" };
  const hit = LIVING_BY_COUNTRY.find((c) => c.re.test(country));
  return { usd: hit?.usd ?? DEFAULT_LIVING_USD, note: hit?.note ?? "typical international student living costs" };
}

export function calculateCosts(input: CostInputs): CostBreakdown {
  const years = input.years && input.years > 0 ? Math.min(input.years, 10) : DEFAULT_YEARS;
  const unknowns: string[] = [];

  // --- Tuition -------------------------------------------------------------
  const tuition = Number(input.annualTuitionUsd) > 0 ? Number(input.annualTuitionUsd) : 0;
  const tuitionEstimated = tuition === 0;
  if (tuitionEstimated) unknowns.push("Annual tuition is not published for this university.");

  // --- Living --------------------------------------------------------------
  // Accommodation is usually inside the living estimate; only add it when the
  // university publishes it separately and no living figure exists.
  const publishedLiving = Number(input.annualLivingEstUsd) > 0 ? Number(input.annualLivingEstUsd) : 0;
  const fallback = livingFor(input.country);
  const living = publishedLiving > 0 ? publishedLiving : fallback.usd;
  if (publishedLiving === 0) {
    unknowns.push(
      `Living costs are not published — using ${fallback.usd.toLocaleString("en-US")} USD/year for ${fallback.note}${input.country ? ` (${input.country})` : ""}.`
    );
  }
  const separateAccommodation =
    publishedLiving === 0 && Number(input.accommodationCostUsd) > 0 ? Number(input.accommodationCostUsd) : 0;

  // --- Extras --------------------------------------------------------------
  const insurance = Number(input.insurancePerYearUsd) > 0 ? Number(input.insurancePerYearUsd) : DEFAULT_INSURANCE_USD;
  if (!(Number(input.insurancePerYearUsd) > 0)) {
    unknowns.push(`Health insurance is estimated at ${DEFAULT_INSURANCE_USD} USD/year — most countries mandate a specific policy.`);
  }
  const books = Number(input.booksPerYearUsd) > 0 ? Number(input.booksPerYearUsd) : DEFAULT_BOOKS_USD;
  const flights = Number(input.flightsPerYearUsd) > 0 ? Number(input.flightsPerYearUsd) : DEFAULT_FLIGHTS_USD;

  const annualTotal = tuition + living + separateAccommodation + insurance + books + flights;

  const lines: CostLine[] = [
    {
      key: "tuition",
      label: "Tuition",
      annualUsd: money(tuition),
      totalUsd: money(tuition * years),
      estimated: tuitionEstimated,
    },
    {
      key: "living",
      label: "Living (food, transport, phone)",
      annualUsd: money(living),
      totalUsd: money(living * years),
      estimated: publishedLiving === 0,
    },
  ];
  if (separateAccommodation > 0) {
    lines.push({
      key: "accommodation",
      label: "Accommodation (published separately)",
      annualUsd: money(separateAccommodation),
      totalUsd: money(separateAccommodation * years),
      estimated: false,
    });
  }
  lines.push(
    {
      key: "insurance",
      label: "Health insurance",
      annualUsd: money(insurance),
      totalUsd: money(insurance * years),
      estimated: !(Number(input.insurancePerYearUsd) > 0),
    },
    {
      key: "books",
      label: "Books & materials",
      annualUsd: money(books),
      totalUsd: money(books * years),
      estimated: !(Number(input.booksPerYearUsd) > 0),
    },
    {
      key: "flights",
      label: "Flights home",
      annualUsd: money(flights),
      totalUsd: money(flights * years),
      estimated: !(Number(input.flightsPerYearUsd) > 0),
    }
  );

  const oneOff = Number(input.visaFeeUsd) > 0 ? Number(input.visaFeeUsd) : DEFAULT_VISA_FEE_USD;
  const appFee = Number(input.applicationFeeUsd) > 0 ? Number(input.applicationFeeUsd) : 0;
  const oneOffTotal = oneOff + appFee;

  // --- Scholarships --------------------------------------------------------
  const scholarships = (input.scholarships ?? []).filter((s) => Number(s.amountUsd) > 0);
  // Only the first matching tuition scholarship can pay the tuition — you do
  // not collect three full rides. Living stipends do stack, in practice rarely.
  const tuitionAid = scholarships.filter((s) => s.covers === "tuition" || s.covers === "both");
  const livingAid = scholarships.filter((s) => s.covers === "living");
  const otherAid = scholarships.filter((s) => s.covers === "other");

  const guaranteedAnnual = 0; // nothing is guaranteed until an award letter exists
  const expectedAnnual = scholarships.reduce((sum, s) => sum + s.amountUsd * clamp01(s.probability), 0);
  const bestCaseAnnual =
    (tuitionAid.length > 0 ? Math.max(...tuitionAid.map((s) => s.amountUsd)) : 0) +
    livingAid.reduce((sum, s) => sum + s.amountUsd, 0) +
    otherAid.reduce((sum, s) => sum + s.amountUsd, 0);

  const coveragePct = annualTotal > 0 ? Math.round(Math.min(100, (bestCaseAnnual / annualTotal) * 100)) : 0;

  // A living stipend does not close a tuition hole — name the mismatch.
  const misaligned: string[] = [];
  for (const s of livingAid) {
    if (tuition > 0 && livingAid.length > 0 && tuitionAid.length === 0) {
      misaligned.push(`${s.name} covers living costs, not tuition — your ${tuition.toLocaleString("en-US")} USD tuition is still unfunded.`);
    }
  }

  // --- Net -----------------------------------------------------------------
  const family = Number(input.familyContributionUsd) > 0 ? Number(input.familyContributionUsd) : 0;
  const afterScholarshipAnnual = Math.max(0, annualTotal - bestCaseAnnual);
  const gapAnnual = Math.max(0, afterScholarshipAnnual - family);

  const totalAfterScholarship = afterScholarshipAnnual * years + oneOffTotal;
  const gapTotal = gapAnnual * years + oneOffTotal;

  let verdict: string;
  if (tuitionEstimated) {
    verdict =
      "Tuition is not published, so this total is a floor, not a quote. Verify the fee on the programme page before planning around it.";
  } else if (gapAnnual <= 0) {
    verdict = `On paper this is affordable: your family's ${family.toLocaleString("en-US")} USD/year covers the ${afterScholarshipAnnual.toLocaleString("en-US")} USD remaining after scholarships. That assumes every scholarship lands.`;
  } else if (coveragePct >= 70) {
    verdict = `Close, but there is a ${gapAnnual.toLocaleString("en-US")} USD/year gap. Your scholarships cover ${coveragePct}% in the best case — the remaining year-one deposit is usually the hard part.`;
  } else {
    verdict = `There is a ${gapAnnual.toLocaleString("en-US")} USD/year gap (${gapTotal.toLocaleString("en-US")} USD over ${years} years). Without more funding this programme is not reachable — look at lower-tuition countries or a full-ride scholarship.`;
  }

  return {
    lines,
    annualTotalUsd: money(annualTotal),
    totalUsd: money(annualTotal * years + oneOffTotal),
    unknowns,
    scholarship: {
      guaranteedAnnualUsd: money(guaranteedAnnual),
      expectedAnnualUsd: money(expectedAnnual),
      bestCaseAnnualUsd: money(bestCaseAnnual),
      coveragePct,
      misaligned,
    },
    net: {
      annualAfterScholarshipUsd: money(afterScholarshipAnnual),
      totalAfterScholarshipUsd: money(totalAfterScholarship),
      familyContributionUsd: money(family),
      gapAnnualUsd: money(gapAnnual),
      gapTotalUsd: money(gapTotal),
      affordable: gapAnnual <= 0,
    },
    verdict,
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Scholarship portfolio health. Ten applications with real deadlines beat one
 * dream award — and a portfolio that is all "Full Tuition + Stipend" with a
 * 3% hit rate is not a plan.
 */
export interface PortfolioInputs {
  scholarships: ScholarshipInput[];
  annualCostUsd: number;
  familyContributionUsd: number;
}

export interface PortfolioAdvice {
  count: number;
  expectedAnnualUsd: number;
  expectedCoveragePct: number;
  /** P(at least one award), treating entries as independent. */
  chanceOfAnyAwardPct: number;
  diversification: "good" | "thin" | "risky";
  advice: string[];
}

export function assessPortfolio(input: PortfolioInputs): PortfolioAdvice {
  const list = input.scholarships.filter((s) => Number(s.amountUsd) > 0);
  const expectedAnnual = list.reduce((sum, s) => sum + s.amountUsd * clamp01(s.probability), 0);
  const chanceOfNone = list.reduce((acc, s) => acc * (1 - clamp01(s.probability)), 1);
  const chanceOfAny = list.length === 0 ? 0 : Math.round((1 - chanceOfNone) * 100);
  const shortfall = Math.max(0, input.annualCostUsd - input.familyContributionUsd);
  const coverage = shortfall > 0 ? Math.round(Math.min(100, (expectedAnnual / shortfall) * 100)) : 100;

  const bigOnly = list.length > 0 && list.every((s) => s.probability <= 0.1);
  const diversification: PortfolioAdvice["diversification"] =
    list.length >= 8 ? "good" : list.length >= 4 ? "thin" : "risky";

  const advice: string[] = [];
  if (list.length < 8) {
    advice.push(
      `Apply to at least 8 scholarships. With ${list.length} you are betting the whole year on ${list.length === 1 ? "one decision" : "a few decisions"}.`
    );
  }
  if (bigOnly) {
    advice.push(
      "Every entry on your list is a low-probability flagship award. Add smaller departmental or country-specific ones — a 4,000 USD award you actually win beats a 40,000 USD one you probably will not."
    );
  }
  if (expectedAnnual < shortfall && list.length > 0) {
    advice.push(
      `Expected funding is ${Math.round(expectedAnnual).toLocaleString("en-US")} USD/year against a ${shortfall.toLocaleString("en-US")} USD shortfall. The gap is real even if everything goes well.`
    );
  }
  if (list.length === 0) {
    advice.push("No scholarships yet. Start with the ones your target universities offer automatically on admission.");
  }
  const soon = list.filter((s) => s.deadlineDays != null && s.deadlineDays <= 30).length;
  if (soon > 0) {
    advice.push(`${soon} deadline${soon === 1 ? "" : "s"} inside 30 days — scholarship files need references, so start those first.`);
  }

  return {
    count: list.length,
    expectedAnnualUsd: Math.round(expectedAnnual),
    expectedCoveragePct: coverage,
    chanceOfAnyAwardPct: chanceOfAny,
    diversification,
    advice,
  };
}
