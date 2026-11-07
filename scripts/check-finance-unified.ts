/**
 * Unified finance model — behavior guard (§7, §5, §13).
 *
 * The earlier report contradicted itself: one section claimed a single model
 * worked, another said `costs.ts` and the financial plan were not unified. This
 * proves the contradiction is closed: `budgetFit.ts` (cards / compare /
 * recommender) and `costs.ts` (the detailed financial plan) now import the SAME
 * `financeModel.ts`, and the required real-world cases produce consistent,
 * honest results.
 *
 * Cases required by the brief:
 *   tuition 3000 + living 15000 + budget 3000; unknown living; partial waiver;
 *   a loan; a monthly stipend; a multi-year programme.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateBudgetFit, budgetVerdict } from "../src/lib/budgetFit";
import { calculateCosts } from "../src/lib/costs";
import { compareUniversities } from "../src/lib/compare";
import {
  knownMoney, normalizeFinancePeriod, periodsPerYear, annualUsd,
  programmeTotal, sumKnown, classifyAid, usableUpfrontAid,
  type MoneyValue,
} from "../src/lib/financeModel";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

console.log("\nUnified finance model — one calculation for every screen");

// ---- Period / currency / duration primitives ------------------------------
check("year / semester / month / programme / one_time stay distinct", () => {
  assert.equal(normalizeFinancePeriod("year"), "year");
  assert.equal(normalizeFinancePeriod("semester"), "semester");
  assert.equal(normalizeFinancePeriod("monthly"), "month");
  assert.equal(normalizeFinancePeriod("whole_programme"), "programme");
  assert.equal(normalizeFinancePeriod("one-time"), "one_time");
  assert.equal(normalizeFinancePeriod("nonsense"), null);
  assert.equal(periodsPerYear("year"), 1);
  assert.equal(periodsPerYear("semester"), 2);
  assert.equal(periodsPerYear("month"), 12);
  assert.equal(periodsPerYear("programme"), null);
  assert.equal(periodsPerYear("one_time"), null);
});

check("original currency without a recorded FX rate stays UNKNOWN, not 0 and not assumed USD", () => {
  const eur: MoneyValue = { amount: 3000, currency: "EUR", period: "year", basis: "original" };
  assert.equal(annualUsd(eur), null);
  const converted: MoneyValue = { amount: 3000, currency: "EUR", period: "year", basis: "converted", fxRateToUsd: 1.1 };
  assert.equal(annualUsd(converted), 3300);
  const usd: MoneyValue = { amount: 3000, currency: "USD", period: "year", basis: "original" };
  assert.equal(annualUsd(usd), 3000);
});

check("unknown is never zero; any unknown line makes the sum unknown", () => {
  assert.equal(knownMoney(null), null);
  assert.equal(knownMoney(NaN), null);
  assert.equal(knownMoney(-1), null);
  assert.equal(knownMoney(0), 0, "an explicit zero IS a known amount");
  assert.equal(sumKnown([3000, null, 15000]), null);
  assert.equal(sumKnown([3000, 15000]), 18000);
});

check("an unknown programme duration yields NO exact programme total", () => {
  assert.equal(programmeTotal(18000, null), null);
  assert.equal(programmeTotal(18000, 0), null);
  assert.equal(programmeTotal(null, 4), null);
  assert.equal(programmeTotal(18000, 4), 72000);
  const plan = calculateCosts({ annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: null });
  assert.equal(plan.totalUsd, null, "unknown duration must not print an exact total");
  assert.ok(plan.unknowns.some((u) => /duration|whole-programme/i.test(u)));
});

// ---- Required case 1: tuition 3000 + living 15000 + budget 3000 ----------
/** All optional annual lines explicitly known (as 0) so the detailed plan can total. */
const KNOWN_EXTRAS = {
  insurancePerYearUsd: 0, booksPerYearUsd: 0, flightsPerYearUsd: 0,
  visaFeeUsd: 0, applicationFeeUsd: 0, accommodationCostUsd: null,
};

check("tuition 3000 + living 15000 + budget 3000 → total_over, never 'only tuition fits'", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 15000, budgetUsd: 3000 });
  assert.equal(fit.state, "total_over");
  assert.equal(fit.tuitionWithinBudget, true); // tuition alone fits
  assert.equal(fit.annualTotalUsd, 18000);
  assert.equal(fit.totalGapUsd, 15000);
  assert.equal(fit.withinBudget, false);
  assert.equal(budgetVerdict(fit), "no");
  const plan = calculateCosts({ ...KNOWN_EXTRAS, annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: 2, familyContributionUsd: 3000 });
  assert.equal(plan.annualTotalUsd, 18000, "the detailed plan reaches the SAME annual total");
  assert.equal(plan.net.affordable, false);
  assert.equal(plan.totalUsd, 36000);
});

// ---- Required case 2: unknown living --------------------------------------
check("unknown living → unknown verdict, no exact total, no 'fits' conclusion", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: null, budgetUsd: 5000 });
  assert.equal(fit.state, "tuition_only", "tuition-only is allowed, but NOT a full 'fits' claim");
  assert.equal(fit.annualTotalUsd, null);
  assert.equal(fit.withinBudget, null);
  assert.equal(budgetVerdict(fit), "unknown");
  assert.deepEqual(fit.missing, ["living"]);
  const plan = calculateCosts({ annualTuitionUsd: 3000, annualLivingEstUsd: null, years: 4 });
  assert.equal(plan.annualTotalUsd, null);
  assert.ok(plan.unknowns.length > 0);
});

check("an explicit zero budget is known and cannot cover positive costs; null remains unknown", () => {
  assert.equal(evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 15000, budgetUsd: 0 }).state, "tuition_over");
  assert.equal(evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 15000, budgetUsd: null }).state, "unknown");
});

// ---- Required case 3: partial waiver --------------------------------------
check("a partial tuition waiver is capped at tuition and cannot 'cover' living costs", () => {
  const waiver = classifyAid({ key: "waiver", covers: "tuition", amountUsd: 5000, period: "year" });
  assert.equal(waiver.kind, "tuition_waiver");
  assert.equal(waiver.appliesTo, "tuition");
  const usable = usableUpfrontAid([waiver], { tuitionAnnualUsd: 3000, livingAnnualUsd: 15000 });
  assert.equal(usable.totalUsd, 3000, "a 5000 waiver against 3000 tuition is capped at 3000");
  const plan = calculateCosts({
    annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: 1,
    scholarships: [{ name: "Partial waiver", amountUsd: 5000, awardPeriod: "year", covers: "tuition" }],
  });
  assert.equal(plan.scholarship.bestCaseAnnualUsd, 3000, "usable optimistic aid is capped at its tuition restriction");
  assert.ok(plan.scholarship.byKind.some((a) => a.kind === "tuition_waiver"));
});

// ---- Required case 4: a loan ----------------------------------------------
check("a repayable loan never reduces net cost and is reported separately", () => {
  const loan = classifyAid({ key: "loan", repayable: true, amountUsd: 10000, period: "year" });
  assert.equal(loan.kind, "repayable_loan");
  assert.equal(loan.reducesUpfrontCost, false);
  assert.equal(usableUpfrontAid([loan], { tuitionAnnualUsd: 3000, livingAnnualUsd: 15000 }).totalUsd, 0);
  const plan = calculateCosts({
    annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: 1,
    scholarships: [{ name: "Bank loan", amountUsd: 10000, awardPeriod: "year", covers: "both", repayable: true }],
  });
  assert.equal(plan.scholarship.bestCaseAnnualUsd, 0);
  assert.equal(plan.scholarship.byKind[0].countsTowardNetCost, false);
  assert.ok(plan.unknowns.some((u) => /loan|repayable|excluded/i.test(u)));
});

check("a reimbursement cannot pay an upfront bill", () => {
  const r = classifyAid({ key: "reimb", reimbursement: true, amountUsd: 4000, period: "year" });
  assert.equal(r.kind, "reimbursement");
  assert.equal(r.reducesUpfrontCost, false);
  const plan = calculateCosts({
    annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: 1,
    scholarships: [{ name: "Travel reimbursement", amountUsd: 4000, awardPeriod: "year", covers: "other", reimbursement: true }],
  });
  assert.equal(plan.scholarship.bestCaseAnnualUsd, 0);
  assert.equal(plan.scholarship.byKind[0].kind, "reimbursement");
});

// ---- Required case 5: monthly stipend -------------------------------------
check("a monthly cash stipend annualizes to 12× and stays distinct from a grant", () => {
  const stipend = classifyAid({ key: "stipend", covers: "living", amountUsd: 200, period: "month", paymentMonths: 12 });
  assert.equal(stipend.kind, "cash_stipend");
  assert.equal(stipend.annualUsd, 2400);
  const plan = calculateCosts({
    annualTuitionUsd: 3000, annualLivingEstUsd: 15000, years: 2,
    scholarships: [{ name: "Monthly stipend", amountUsd: 200, awardPeriod: "month", paymentMonths: 12, covers: "living" }],
  });
  assert.equal(plan.scholarship.bestCaseAnnualUsd, 2400);
  assert.equal(plan.scholarship.bestCaseOneTimeUsd, 0);
});

// ---- Required case 6: multi-year programme --------------------------------
check("multi-year: annual and whole-programme totals reconcile once, no double counting", () => {
  const plan = calculateCosts({
    ...KNOWN_EXTRAS, annualTuitionUsd: 3000, annualLivingEstUsd: 15000,
    visaFeeUsd: 400, applicationFeeUsd: 80, years: 4,
    scholarships: [{ name: "Annual grant", status: "awarded", fundingYears: 4, amountUsd: 1000, awardPeriod: "year", covers: "both" }],
  });
  assert.equal(plan.annualTotalUsd, 18000);
  assert.equal(plan.totalUsd, 18000 * 4 + 480, "one-time fees are added ONCE, not per year");
  assert.equal(plan.net.totalAfterScholarshipUsd, 18000 * 4 + 480 - 1000 * 4,
    "the recurring grant applies to each year; one-time fees are not multiplied");
  const oneTime = plan.lines.filter((l) => l.frequency === "one_time");
  assert.ok(oneTime.every((l) => l.annualUsd === null), "one-time fees never enter the annual budget");
});

check("first-year-only fees are not recurring in a later year", () => {
  const plan = calculateCosts({ ...KNOWN_EXTRAS, annualTuitionUsd: 3000, annualLivingEstUsd: 15000, visaFeeUsd: 400, years: 1 });
  const visa = plan.lines.find((l) => l.key === "visa_fee");
  assert.ok(visa && visa.frequency === "one_time" && visa.annualUsd === null);
});

// ---- Every screen uses the SAME model --------------------------------------
check("card, compare, recommender and financial plan all import the shared engine", () => {
  const files = [
    "src/lib/decisionPills.ts", "src/lib/compare.ts", "src/lib/recommend.ts",
    "src/lib/costs.ts", "src/lib/budgetFit.ts",
  ];
  for (const f of files) assert.match(read(f), /budgetFit|financeModel|evaluateBudgetFit/, `${f} must use the shared model`);
  assert.match(read("src/lib/budgetFit.ts"), /from "\.\/financeModel"/);
  assert.match(read("src/lib/costs.ts"), /from "\.\/financeModel"/);
});

check("compare never calls a partial cost 'within budget'", () => {
  const sheet = compareUniversities([
    { id: 1, name: "A", annualTuitionUsd: 3000, annualLivingEstUsd: 15000 },
    { id: 2, name: "B", annualTuitionUsd: 3000, annualLivingEstUsd: null },
  ], { budgetAnnualUsd: 3000 });
  // Whatever the exact shape, a row with unknown living must not be 'fits'.
  const serialized = JSON.stringify(sheet);
  assert.doesNotMatch(serialized, /"state":"total_fits"/);
});

check("the shared state vocabulary is exactly the five honest states", () => {
  const states = new Set(
    [
      evaluateBudgetFit({}).state,
      evaluateBudgetFit({ tuitionUsd: 5000, livingUsd: 1000, budgetUsd: 3000 }).state,
      evaluateBudgetFit({ tuitionUsd: 3000, budgetUsd: 5000 }).state,
      evaluateBudgetFit({ tuitionUsd: 1000, livingUsd: 1000, budgetUsd: 5000 }).state,
      evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 15000, budgetUsd: 3000 }).state,
    ],
  );
  assert.deepEqual([...states].sort(), ["total_fits", "total_over", "tuition_only", "tuition_over", "unknown"].sort());
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
