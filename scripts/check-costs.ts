/**
 * Deterministic checks for the Cost Calculator and Scholarship Portfolio
 * (Phase 3).
 *
 * Annual and whole-programme totals must include every required line. Missing
 * or unsupported amounts stay unknown instead of being treated as zero or
 * replaced with generic estimates.
 *
 * Run: npm run test:costs
 */

import { assessPortfolio, calculateCosts, type ScholarshipInput } from "../src/lib/costs";
import { normalizeScholarshipAwardPeriod, resolvedUsdScholarshipAmount, resolvedUsdUniversityCosts } from "../src/lib/usdCosts";
import { normalizedScholarshipAmounts } from "../src/lib/research-agent/normalize";

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
  awardPeriod: "year",
  covers: "tuition",
  deadlineDays: 60,
  ...over,
});

const completeCosts = {
  annualTuitionUsd: 30000,
  annualLivingEstUsd: 15000,
  insurancePerYearUsd: 1500,
  booksPerYearUsd: 1000,
  flightsPerYearUsd: 1600,
  visaFeeUsd: 400,
  applicationFeeUsd: 80,
  years: 4,
};

// ---------------------------------------------------------------------------
section("1. Known cost lines reconcile; missing values remain unknown");

const full = calculateCosts(completeCosts);
check("the annual total is the sum of the parts", full.annualTotalUsd === 30000 + 15000 + 1500 + 1000 + 1600);
check("annual lines reconcile while one-off fees are excluded from the annual budget", full.lines.filter((line) => line.frequency === "annual").reduce((sum, line) => sum + (line.annualUsd ?? 0), 0) === full.annualTotalUsd && full.lines.filter((line) => line.frequency === "one_time").every((line) => line.annualUsd === null));
const fractionalCostCases = Array.from({ length: 25 }, (_, index) => calculateCosts({
  annualTuitionUsd: 1000.25 + index * 0.31,
  annualLivingEstUsd: 500.45 + index * 0.17,
  insurancePerYearUsd: 100.18 + index * 0.12,
  booksPerYearUsd: 40.23 + index * 0.06,
  flightsPerYearUsd: 120.29 + index * 0.09,
  visaFeeUsd: 75.37,
  applicationFeeUsd: 25.41,
  years: 1 + (index % 6),
}));
check("rounded annual lines reconcile for varied fractional inputs", fractionalCostCases.every((cost) => cost.lines.filter((line) => line.frequency === "annual").reduce((sum, line) => sum + (line.annualUsd ?? 0), 0) === cost.annualTotalUsd));
check("the multi-year total adds the one-off fees once", full.totalUsd === (30000 + 15000 + 1500 + 1000 + 1600) * 4 + 480, `got ${full.totalUsd}`);
check("every recurring and one-off line is itemised", full.lines.length === 7);
check("unknowns are empty when every input is explicit", full.unknowns.length === 0);

const zeroCosts = calculateCosts({
  annualTuitionUsd: 0,
  annualLivingEstUsd: 0,
  insurancePerYearUsd: 0,
  booksPerYearUsd: 0,
  flightsPerYearUsd: 0,
  visaFeeUsd: 0,
  applicationFeeUsd: 0,
  years: 1,
});
check("explicit zero is a known amount, not missing data", zeroCosts.annualTotalUsd === 0 && zeroCosts.totalUsd === 0 && zeroCosts.unknowns.length === 0);

const tuitionOnly = calculateCosts({ annualTuitionUsd: 30000, years: 4 });
check("missing annual lines stay null instead of receiving country defaults", tuitionOnly.annualTotalUsd === null && tuitionOnly.lines.find((line) => line.key === "living")?.annualUsd === null);
check("missing annual lines make the annual funding gap unknown", tuitionOnly.net.gapAnnualUsd === null);
check("missing amounts are named for verification", tuitionOnly.unknowns.some((message) => /living costs are unknown/i.test(message)) && tuitionOnly.unknowns.some((message) => /health insurance cost is unknown/i.test(message)));

section("2. Missing and unsupported inputs do not become zeroes");

const noTuition = calculateCosts({ country: "Germany", years: 3 });
check("missing tuition stays unknown", noTuition.lines.find((line) => line.key === "tuition")?.annualUsd === null);
check("missing tuition keeps the annual aggregate unknown", noTuition.annualTotalUsd === null);
check("the verdict refuses to present an incomplete subtotal as a full annual cost", /full annual total and funding gap cannot be calculated/i.test(noTuition.verdict));
check("missing insurance stays unknown instead of using a generic estimate", noTuition.lines.find((line) => line.key === "insurance")?.annualUsd === null);
check("unknown one-off fees keep the whole-programme total unknown", noTuition.lines.filter((line) => line.frequency === "one_time").every((line) => line.totalUsd === null) && noTuition.totalUsd === null);

section("3. Published living costs and accommodation");

const knownLiving = calculateCosts({ annualLivingEstUsd: 9000, country: "United States", years: 2 });
check("a published USD living figure is preserved", knownLiving.lines.find((line) => line.key === "living")?.annualUsd === 9000);
check("published living costs do not double-count accommodation", calculateCosts({ annualLivingEstUsd: 15000, accommodationCostUsd: 8000, years: 2 }).lines.every((line) => line.key !== "accommodation"));
const separateAccommodation = calculateCosts({ accommodationCostUsd: 8000, years: 2 });
check("separately published accommodation is shown without treating missing living costs as zero", separateAccommodation.lines.some((line) => line.key === "accommodation" && line.annualUsd === 8000) && separateAccommodation.lines.find((line) => line.key === "living")?.annualUsd === null && separateAccommodation.annualTotalUsd === null);

const annualKnownButFeeUnknown = calculateCosts({ ...completeCosts, visaFeeUsd: null, familyContributionUsd: 0 });
check("unknown one-off fees do not erase a known annual budget", annualKnownButFeeUnknown.annualTotalUsd === 49100);
check("unknown one-off fees keep the programme total and total gap unknown", annualKnownButFeeUnknown.totalUsd === null && annualKnownButFeeUnknown.net.gapTotalUsd === null);
check("the annual gap remains available when only one-off fees are unknown", annualKnownButFeeUnknown.net.gapAnnualUsd === 49100);
const annualCoveredButFeeUnknown = calculateCosts({ ...completeCosts, visaFeeUsd: null, familyContributionUsd: 60000 });
check("unknown one-off costs prevent an affordability claim even when annual support covers the year", annualCoveredButFeeUnknown.net.gapAnnualUsd === 0 && annualCoveredButFeeUnknown.net.affordable === null && /whole-programme affordability remains unknown/i.test(annualCoveredButFeeUnknown.verdict));

section("4. Programme duration is never silently defaulted");

const noDuration = calculateCosts({ ...completeCosts, years: null });
check("annual costs can be known without inventing a programme duration", noDuration.annualTotalUsd === 49100);
check("whole-programme costs remain unknown when duration is absent", noDuration.totalUsd === null && noDuration.lines.find((line) => line.key === "tuition")?.totalUsd === null);
check("a duration outside the supported range does not fabricate a capped total", calculateCosts({ ...completeCosts, years: 99 }).totalUsd === null);

section("5. Currency-safe catalogue adapters");

const resolvedCanonicalUsd = resolvedUsdUniversityCosts({
  annualTuition: 12000,
  tuitionCurrency: "usd",
  tuitionPeriod: "year",
  annualTuitionUsd: 9999,
  annualLivingEst: 1000,
  livingCostCurrency: "USD",
  livingCostPeriod: "month",
  applicationFee: 75,
  applicationFeeCurrency: "USD",
});
check("canonical USD tuition is preferred over its USD legacy mirror", resolvedCanonicalUsd.annualTuitionUsd === 12000);
check("monthly living costs are normalized to annual USD", resolvedCanonicalUsd.annualLivingEstUsd === 12000);
check("scholarship award periods normalize only supported comparable bases", (() =>
  normalizeScholarshipAwardPeriod("annual") === "year" &&
  normalizeScholarshipAwardPeriod("per month") === "month" &&
  normalizeScholarshipAwardPeriod("one-time") === "one_time" &&
  normalizeScholarshipAwardPeriod("variable") === null
)());
check("one-off application fees remain explicit USD values", resolvedCanonicalUsd.applicationFeeUsd === 75);
check("a known non-USD canonical value stays unknown instead of falling back to legacy USD", resolvedUsdUniversityCosts({ annualTuition: 9000, tuitionCurrency: "GBP", annualTuitionUsd: 40000 }).annualTuitionUsd === null);
check("an absent canonical value can use the explicitly USD legacy column", resolvedUsdUniversityCosts({ annualTuition: null, annualTuitionUsd: 40000 }).annualTuitionUsd === 40000);
check("scholarship amounts are only comparable when their canonical currency is USD", (() => {
  const usd = resolvedUsdScholarshipAmount({ awardAmount: 5000, awardCurrency: "USD", amountUsdValue: 4000 });
  const nonUsd = resolvedUsdScholarshipAmount({ awardAmount: 5000, awardCurrency: "EUR", amountUsdValue: 4000 });
  const legacy = resolvedUsdScholarshipAmount({ awardAmount: null, amountUsdValue: 4000 });
  return usd === 5000 && nonUsd === null && legacy === 4000;
})());
check("research persistence preserves native awards without fabricating USD conversions", (() => {
  const usd = normalizedScholarshipAmounts({ amountUsd: 5000, currency: "USD" });
  const native = normalizedScholarshipAmounts({ amountUsd: 5500, amountOriginal: 5000, currency: "EUR" });
  const inconsistent = normalizedScholarshipAmounts({ amountUsd: 5500, currency: "EUR" });
  const unsupported = normalizedScholarshipAmounts({ amountOriginal: 5000, currency: "XYZ" });
  return usd.amountUsdValue === 5000 && usd.awardAmount === 5000 && usd.awardCurrency === "USD" &&
    native.amountUsdValue === null && native.awardAmount === 5000 && native.awardCurrency === "EUR" &&
    inconsistent.amountUsdValue === null && inconsistent.awardAmount === null && inconsistent.awardCurrency === "EUR" &&
    unsupported.amountUsdValue === null && unsupported.awardAmount === 5000 && unsupported.awardCurrency === "XYZ";
})());

section("6. Scholarships");

const funded = calculateCosts({
  ...completeCosts,
  scholarships: [sch({ name: "Full Ride", amountUsd: 45000, covers: "both" })],
  familyContributionUsd: 5000,
});
check("best-case aid is reported as a recurring annual amount", funded.scholarship.bestCaseAnnualUsd === 45000);
check("award totals are shown only as best-case values, not expectations", funded.scholarship.bestCaseAnnualUsd === 45000);
check("coverage is calculated only when annual costs and awards are known", funded.scholarship.coveragePct != null && funded.scholarship.coveragePct > 0 && funded.scholarship.coveragePct <= 100);
check("the net gap accounts only for explicitly confirmed family contribution", funded.net.gapAnnualUsd === Math.max(0, (funded.net.annualAfterScholarshipUsd ?? Infinity) - 5000));

const periodAwareAwards = calculateCosts({
  ...completeCosts,
  years: 2,
  scholarships: [
    sch({ name: "Annual award", amountUsd: 1000, awardPeriod: "year", covers: "tuition" }),
    sch({ name: "Monthly stipend", amountUsd: 200, awardPeriod: "month", covers: "living" }),
    sch({ name: "One-time grant", amountUsd: 500, awardPeriod: "one-time", covers: "other" }),
  ],
});
check("monthly awards are normalized to annual USD without mixing one-time aid", periodAwareAwards.scholarship.bestCaseAnnualUsd === 3400 && periodAwareAwards.scholarship.bestCaseOneTimeUsd === 500);
check("one-time aid is subtracted once from the programme total", periodAwareAwards.net.totalAfterScholarshipUsd === (49100 * 2 + 480) - 3400 * 2 - 500);

const unknownAnnualAward = calculateCosts({
  ...completeCosts,
  scholarships: [sch({ name: "Unknown annual amount", amountUsd: null, awardPeriod: "year" })],
});
check("an unknown annual award keeps annual scholarship totals and gaps unknown", unknownAnnualAward.scholarship.bestCaseAnnualUsd === null && unknownAnnualAward.net.gapAnnualUsd === null);
const unknownPeriodAward = calculateCosts({
  ...completeCosts,
  scholarships: [sch({ name: "Unsupported award", amountUsd: 5000, awardPeriod: "variable" })],
});
check("an unsupported award period is not treated as annual USD", unknownPeriodAward.scholarship.bestCaseAnnualUsd === null && unknownPeriodAward.net.gapAnnualUsd === null);
const unknownOneTimeAward = calculateCosts({
  ...completeCosts,
  scholarships: [sch({ name: "Unknown one-time award", amountUsd: null, awardPeriod: "one_time" })],
  familyContributionUsd: 0,
});
check("an unknown one-time award does not fabricate an annual zero or a programme total", unknownOneTimeAward.net.gapAnnualUsd === 49100 && unknownOneTimeAward.net.gapTotalUsd === null);

const affordable = calculateCosts({
  ...completeCosts,
  annualTuitionUsd: 10000,
  annualLivingEstUsd: 8000,
  familyContributionUsd: 30000,
});
check("a covered programme reads as affordable only with a known explicit contribution", affordable.net.affordable === true);
check("the gap is zero", affordable.net.gapAnnualUsd === 0);
check("the verdict still states the best-case condition", /best-case scenario/i.test(affordable.verdict));

const unfunded = calculateCosts({
  ...completeCosts,
  annualTuitionUsd: 55000,
  annualLivingEstUsd: 18000,
  familyContributionUsd: 5000,
});
check("an unreachable programme reads as not affordable", unfunded.net.affordable === false);
check("the verdict names the gap", unfunded.net.gapAnnualUsd != null && unfunded.verdict.includes(unfunded.net.gapAnnualUsd.toLocaleString("en-US")));

const misaligned = calculateCosts({
  ...completeCosts,
  annualTuitionUsd: 40000,
  annualLivingEstUsd: 15000,
  scholarships: [sch({ name: "Living Stipend", amountUsd: 12000, covers: "living" })],
});
check(
  "a living stipend that cannot pay tuition is called out",
  misaligned.scholarship.misaligned.some((message) => /does not pay/i.test(message)),
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
check("zero/missing award amounts prompt provider verification and stay unknown in totals", assessPortfolio({ scholarships: [sch({ name: "Unknown amount", amountUsd: 0 })] }).advice.some((item) => item.key === "missingAmounts") && calculateCosts({ ...completeCosts, scholarships: [sch({ name: "Unknown amount", amountUsd: 0 })] }).scholarship.bestCaseAnnualUsd === null);
check("an empty portfolio points to official catalogue information", assessPortfolio({ scholarships: [] }).advice.some((item) => item.key === "noSavedAwards"));

const unknownFamily = calculateCosts({ ...completeCosts, familyContributionUsd: null });
check("missing family contribution stays explicitly unknown, not zero", unknownFamily.net.familyContributionKnown === false && unknownFamily.net.familyContributionUsd === null);
check("missing contribution is not described as affordability", /explicitly confirmed/i.test(unknownFamily.verdict) && unknownFamily.net.affordable === null);
check("family income is never used as available funding", unknownFamily.net.gapAnnualUsd === unknownFamily.net.annualAfterScholarshipUsd);

section("7. Determinism");

const a = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
const b = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
check("the same input gives the same numbers", JSON.stringify(a) === JSON.stringify(b));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
