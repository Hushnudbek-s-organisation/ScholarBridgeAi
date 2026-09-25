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

import { assessPortfolio, calculateCosts, type ScholarshipInput } from "../src/lib/costs";

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
  probability: 0.5,
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
  years: 4,
});
check("the annual total is the sum of the parts", full.annualTotalUsd === 30000 + 15000 + 1500 + 1000 + 1600);
check(
  "the multi-year total adds the one-off visa fee once, not per year",
  full.totalUsd === (30000 + 15000 + 1500 + 1000 + 1600) * 4 + 400,
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
check("Germany's estimate mentions the blocked account", germany.unknowns.some((u) => /blocked account/i.test(u)));

section("4. Year count is bounded");

check("a 4-year default is used when none is given", calculateCosts({ annualTuitionUsd: 10000 }).lines[0].totalUsd === 40000);
check("an absurd year count is capped", calculateCosts({ annualTuitionUsd: 10000, years: 99 }).lines[0].totalUsd === 100000);

section("5. Scholarships");

const funded = calculateCosts({
  annualTuitionUsd: 30000,
  annualLivingEstUsd: 15000,
  years: 4,
  scholarships: [sch({ name: "Full Ride", amountUsd: 45000, covers: "both", probability: 0.3 })],
  familyContributionUsd: 5000,
});
check("best-case aid is reported", funded.scholarship.bestCaseAnnualUsd === 45000);
check("expected aid weights by probability", funded.scholarship.expectedAnnualUsd === 13500);
check("nothing is called guaranteed", funded.scholarship.guaranteedAnnualUsd === 0);
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
  scholarships: [sch({ name: "Living Stipend", amountUsd: 12000, covers: "living", probability: 0.8 })],
});
check(
  "a living stipend that cannot pay tuition is called out",
  misaligned.scholarship.misaligned.some((m) => /still unfunded/i.test(m)),
  misaligned.scholarship.misaligned.join("|")
);

section("6. Scholarship portfolio");

const portfolio = assessPortfolio({
  scholarships: Array.from({ length: 9 }, (_, i) =>
    sch({ name: `Award ${i}`, amountUsd: 5000, covers: "tuition", probability: 0.25, deadlineDays: 90 })
  ),
  // Shortfall is 8,000 against 11,250 expected, so this portfolio is genuinely
  // healthy and should raise no advice at all.
  annualCostUsd: 20000,
  familyContributionUsd: 12000,
});
check("the portfolio counts entries", portfolio.count === 9);
check("a diversified portfolio is rated good", portfolio.diversification === "good");
check("expected funding is probability-weighted", portfolio.expectedAnnualUsd === 11250);
check("the chance of at least one award exceeds any single one", portfolio.chanceOfAnyAwardPct > 25);
check("the chance of any award stays under 100", portfolio.chanceOfAnyAwardPct < 100);
check("a healthy portfolio raises no advice", portfolio.advice.length === 0);

const thin = assessPortfolio({
  scholarships: [sch({ name: "Fulbright", amountUsd: 40000, covers: "both", probability: 0.05 })],
  annualCostUsd: 30000,
  familyContributionUsd: 0,
});
check("one entry is rated risky", thin.diversification === "risky");
check("a single flagship award is warned about", thin.advice.some((a) => /at least 8 scholarships/i.test(a)));
check("an all-low-probability list is warned about", thin.advice.some((a) => /low-probability flagship/i.test(a)));
check("a real shortfall is named", thin.advice.some((a) => /shortfall/i.test(a)));

const imminent = assessPortfolio({
  scholarships: [sch({ name: "Soon", deadlineDays: 10 }), sch({ name: "Later", deadlineDays: 200 })],
  annualCostUsd: 20000,
  familyContributionUsd: 20000,
});
check("an imminent deadline is surfaced", imminent.advice.some((a) => /inside 30 days/i.test(a)));
check(
  "no shortfall advice when the family covers everything",
  !imminent.advice.some((a) => /shortfall/i.test(a))
);
check("an empty portfolio says where to start", assessPortfolio({ scholarships: [], annualCostUsd: 20000, familyContributionUsd: 0 }).advice.some((a) => /No scholarships yet/i.test(a)));

section("7. Determinism");

const a = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
const b = calculateCosts({ annualTuitionUsd: 25000, country: "Canada", years: 4 });
check("the same input gives the same numbers", JSON.stringify(a) === JSON.stringify(b));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
