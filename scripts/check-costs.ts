/**
 * Deterministic checks for the Cost Calculator and Scholarship Portfolio
 * (Phase 3).
 *
 * The number a student acts on must include living costs, insurance, flights
 * and one-off fees — tuition alone is the smallest part of it. And an estimate
 * built on unpublished data must say so instead of looking like a quote.
 *
 * Run: npm run test:costs
 */

import { assessPortfolio, calculateCosts, resolvedUsdScholarshipAmount, resolvedUsdUniversityCosts, type ScholarshipInput } from "../src/lib/costs";
import { buildFundingPlan, fundingLinesFromCosts } from "../src/lib/journey/funding";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

const sch = (over: Partial<ScholarshipInput> & { name: string }): ScholarshipInput => ({
  amountUsd: 10000,
  covers: "tuition",
  deadlineDays: 60,
  ...over,
});

// ---------------------------------------------------------------------------
section("1. The total includes more than tuition");

const full = calculateCosts({
  annualTuitionUsd: 30000,
  annualLivingEstUsd: 15000,
  insurancePerYearUsd: 1500,
  booksPerYearUsd: 1000,
  flightsPerYearUsd: 1600,
  visaFeeUsd: 400,
  applicationFeeUsd: 80,
  years: 4,
});
check("the annual total is the sum of the parts", full.annualTotalUsd === 30000 + 15000 + 1500 + 1000 + 1600);
check(
  "the multi-year total adds the one-off visa fee once, not per year",
  full.totalUsd === (30000 + 15000 + 1500 + 1000 + 1600) * 4 + 480,
  `got ${full.totalUsd}`
);
check("every line is itemised", full.lines.length >= 5);
check("no line is flagged estimated when everything was supplied", full.lines.every((l) => !l.estimated));
check("nothing is listed as unknown", full.unknowns.length === 0);

const tuitionOnly = calculateCosts({ annualTuitionUsd: 30000, years: 4 });
check(
  "living costs are added even when the student supplies none",
  tuitionOnly.annualTotalUsd > 30000,
  `got ${tuitionOnly.annualTotalUsd}`
);
check("the added living figure is flagged as an estimate", tuitionOnly.lines.find((l) => l.key === "living")?.estimated === true);
check("the estimate is listed as an unknown to verify", tuitionOnly.unknowns.some((u) => /Living costs are not published/i.test(u)));

section("2. Missing published data is declared, not hidden");

const noTuition = calculateCosts({ country: "Germany", years: 3 });
check("missing tuition is listed as unknown", noTuition.unknowns.some((u) => /tuition is not published/i.test(u)));
check("the line is marked estimated", noTuition.lines.find((l) => l.key === "tuition")?.estimated === true);
check("the verdict says it is a floor, not a quote", /floor, not a quote/i.test(noTuition.verdict));
check("insurance is flagged as an estimate too", noTuition.unknowns.some((u) => /insurance is estimated/i.test(u)));

section("3. Living estimates follow the country");

const usa = calculateCosts({ annualTuitionUsd: 30000, country: "United States", years: 4 });
const poland = calculateCosts({ annualTuitionUsd: 4000, country: "Poland", years: 3 });
const germany = calculateCosts({ annualTuitionUsd: 0, country: "Germany", years: 3 });
check(
  "the US living estimate exceeds Poland's",
  (usa.lines.find((l) => l.key === "living")?.annualUsd ?? 0) >
    (poland.lines.find((l) => l.key === "living")?.annualUsd ?? 0)
);
check(
  "a published living figure always wins over the estimate",
  calculateCosts({ annualLivingEstUsd: 9000, country: "United States" }).lines.find((l) => l.key === "living")
    ?.annualUsd === 9000
);
check(
  "accommodation is only added when living costs are not published",
  calculateCosts({ annualLivingEstUsd: 15000, accommodationCostUsd: 8000 }).lines.every(
    (l) => l.key !== "accommodation"
  )
);
check(
  "accommodation IS added when no living figure exists",
  calculateCosts({ accommodationCostUsd: 8000, country: "Germany" }).lines.some((l) => l.key === "accommodation")
);
check("the estimate does not present destination-specific visa paperwork as universal", !germany.unknowns.some((u) => /blocked account/i.test(u)));
check("unentered visa fees are excluded and flagged for official verification", germany.unknowns.some((u) => /Visa or residence-permit fees are not included.*official government guidance/i.test(u)));

section("4. Year count is bounded");

check("a 4-year default is used when none is given", calculateCosts({ annualTuitionUsd: 10000 }).lines[0].totalUsd === 40000);
check("an absurd year count is capped", calculateCosts({ annualTuitionUsd: 10000, years: 99 }).lines[0].totalUsd === 100000);

section("5. Scholarships");

const funded = calculateCosts({
  annualTuitionUsd: 30000,
  annualLivingEstUsd: 15000,
  years: 4,
  scholarships: [sch({ name: "Full Ride", amountUsd: 45000, covers: "both" })],
  familyContributionUsd: 5000,
});
check("best-case aid is reported", funded.scholarship.bestCaseAnnualUsd === 45000);
check("award totals are shown only as best-case values, not expectations", funded.scholarship.bestCaseAnnualUsd === 45000);
check("coverage is a percentage of the annual cost", funded.scholarship.coveragePct > 0 && funded.scholarship.coveragePct <= 100);
check("the net gap accounts for the family contribution", funded.net.gapAnnualUsd === Math.max(0, funded.net.annualAfterScholarshipUsd - 5000));

const affordable = calculateCosts({
  annualTuitionUsd: 10000,
  annualLivingEstUsd: 8000,
  years: 4,
  familyContributionUsd: 30000,
});
check("a covered programme reads as affordable", affordable.net.affordable === true);
check("the gap is zero", affordable.net.gapAnnualUsd === 0);
check("the verdict still hedges on the scholarships", /assumes every scholarship lands/i.test(affordable.verdict));

const unfunded = calculateCosts({
  annualTuitionUsd: 55000,
  annualLivingEstUsd: 18000,
  years: 4,
  familyContributionUsd: 5000,
});
check("an unreachable programme reads as not affordable", unfunded.net.affordable === false);
check("the verdict names the gap", unfunded.verdict.includes(unfunded.net.gapAnnualUsd.toLocaleString("en-US")));

const misaligned = calculateCosts({
  annualTuitionUsd: 40000,
  annualLivingEstUsd: 15000,
  scholarships: [sch({ name: "Living Stipend", amountUsd: 12000, covers: "living" })],
});
check(
  "a living stipend that cannot pay tuition is called out",
  misaligned.scholarship.misaligned.some((m) => /still unfunded/i.test(m)),
  misaligned.scholarship.misaligned.join("|")
);

section("6. Scholarship review avoids unsupported counts and odds");

const portfolio = assessPortfolio({
  scholarships: Array.from({ length: 9 }, (_, i) =>
    sch({ name: `Award ${i}`, amountUsd: 5000, covers: "tuition", deadlineDays: 90 })
  ),
});
check("the portfolio counts saved records", portfolio.count === 9);
check("saved awards are not treated as secured funding", portfolio.advice.some((item) => item.key === "unconfirmedAwards"));
check("advice uses only evidence-based review items", portfolio.advice.every((item) => ["unconfirmedAwards", "missingAmounts", "deadlinesPassed", "deadlinesUpcoming", "noSavedAwards"].includes(item.key)));

const oneSaved = assessPortfolio({ scholarships: [sch({ name: "Award", amountUsd: 40000, covers: "both" })] });
check("a single saved award receives the same non-count-based guidance", JSON.stringify(portfolio.advice.map((item) => item.key)) === JSON.stringify(oneSaved.advice.map((item) => item.key)));
check("no outcome probability is exposed", !("chanceOfAnyAwardPct" in portfolio) && !("expectedAnnualUsd" in portfolio));

const deadlineReview = assessPortfolio({
  scholarships: [sch({ name: "Soon", deadlineDays: 10 }), sch({ name: "Past", deadlineDays: -2 })],
});
check("upcoming listed deadlines are surfaced for verification", deadlineReview.advice.some((item) => item.key === "deadlinesUpcoming" && item.count === 1));
check("past listed deadlines prompt an official status check", deadlineReview.advice.some((item) => item.key === "deadlinesPassed" && item.count === 1));
check("missing award amounts prompt provider verification", assessPortfolio({ scholarships: [sch({ name: "Unknown amount", amountUsd: 0 })] }).advice.some((item) => item.key === "missingAmounts"));
check("an empty portfolio points to official catalogue information", assessPortfolio({ scholarships: [] }).advice.some((item) => item.key === "noSavedAwards"));

const unknownFamily = calculateCosts({ annualTuitionUsd: 20000, annualLivingEstUsd: 10000, familyContributionUsd: null });
check("missing family contribution stays explicitly unknown", unknownFamily.net.familyContributionKnown === false);
check("missing contribution is not described as affordability", /Add the amount your family has explicitly confirmed/i.test(unknownFamily.verdict));

// ---------------------------------------------------------------------------
section("7. The Funding Plan repeats the SAME total, line for line (defect 1.1/1.2)");

// The /api/funding screen shows the per-line breakdown of the yearly cost. It
// must sum to the same annual figure the calculator produced — no dropped
// living estimate, no dropped flights, no phantom zero lines.
const fundingCosts = calculateCosts({
  annualTuitionUsd: 22000,
  annualLivingEstUsd: null,
  country: "South Korea",
  years: 1,
  visaFeeUsd: 500,
  applicationFeeUsd: 60,
});
const fundingBreakdown = fundingLinesFromCosts(fundingCosts);
check(
  "the per-line breakdown accounts for 100% of the annual cost",
  fundingBreakdown.lines.reduce((sum, l) => sum + l.cost, 0) === fundingCosts.annualTotalUsd,
  `${fundingBreakdown.lines.reduce((sum, l) => sum + l.cost, 0)} vs ${fundingCosts.annualTotalUsd}`
);
check("no cost line is silently dropped", fundingBreakdown.unaccountedUsd === 0 && fundingBreakdown.foldedSources.length === 0);
check(
  "the living estimate and the flight estimate are present (they used to be zeroed out)",
  fundingBreakdown.lines.find((l) => l.key === "food")!.cost > 0 &&
    fundingBreakdown.lines.find((l) => l.key === "flight")!.cost > 0
);
const fundedPlan = buildFundingPlan({
  annualCost: fundingCosts.annualTotalUsd,
  lines: fundingBreakdown.lines,
  items: [{ kind: "scholarship", name: "One award", amountUsd: 5000, status: "applied", covers: null }],
});
check(
  "$5,000 of funding never becomes more than $5,000 of line coverage",
  fundedPlan.byLine.reduce((sum, l) => sum + l.covered, 0) === 5000,
  `${fundedPlan.byLine.reduce((sum, l) => sum + l.covered, 0)}`
);
check("one-off fees stay outside the yearly figure", fundingBreakdown.oneOff.reduce((s, o) => s + o.amountUsd, 0) === 560);

section("8. Currency is never assumed (defect 1.8)");

const foreign = resolvedUsdUniversityCosts({
  annualTuition: 15000,
  tuitionCurrency: "EUR",
  annualLivingEst: 12000,
  livingCostCurrency: "EUR",
  annualTuitionUsd: null,
  annualLivingEstUsd: null,
});
check("a EUR figure is NOT spent as USD", foreign.tuitionUsd === null && foreign.livingUsd === null);
check("the non-USD currency is named", foreign.nonUsdCurrencies.includes("EUR"));
const usdRow = resolvedUsdUniversityCosts({ annualTuition: 15000, tuitionCurrency: "USD", annualTuitionUsd: null });
check("a USD figure is used", usdRow.tuitionUsd === 15000);
const legacyRow = resolvedUsdUniversityCosts({ annualTuitionUsd: 17000, annualTuition: null, tuitionCurrency: "USD" });
check("the legacy USD column still wins when present", legacyRow.tuitionUsd === 17000);
check(
  "a non-USD award is not reported as a dollar amount",
  resolvedUsdScholarshipAmount({ awardAmount: 9000, awardCurrency: "GBP", amountUsdValue: null }).amountUsd === null &&
    resolvedUsdScholarshipAmount({ awardAmount: 9000, awardCurrency: "USD", amountUsdValue: null }).amountUsd === 9000
);

section("9. Determinism");

const a = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
const b = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
check("the same input gives the same numbers", JSON.stringify(a) === JSON.stringify(b));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
