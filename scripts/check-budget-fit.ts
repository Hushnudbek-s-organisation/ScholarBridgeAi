/**
 * P1 regression — a university is NOT "within budget" because its tuition is.
 *
 * Reported: $3,000 tuition + $15,000 living shown as "byudjetga sig'adi" for a
 * $3,000 annual budget. Exact case is asserted below.
 *
 * Run: npm run test:budget-fit
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateBudgetFit } from "../src/lib/budgetFit";
import { evaluateUniversityDecision } from "../src/lib/decisionPills";
import { compareUniversities } from "../src/lib/compare";
import { calculateCosts } from "../src/lib/costs";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

console.log("\nP1 — tuition-only vs full annual cost");

check("the exact audit case: 3k tuition + 15k living is NOT within a 3k budget", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 15000, budgetUsd: 3000 });
  assert.equal(fit.state, "total_over");
  assert.equal(fit.annualTotalUsd, 18000);
  assert.equal(fit.totalGapUsd, 15000);
  assert.equal(fit.withinBudget, false);
  assert.deepEqual(fit.lines.map((l) => l.key), ["tuition", "living"]);
});

check("tuition alone fitting with unknown living is 'incomplete', never 'fits'", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: null, budgetUsd: 3000 });
  assert.equal(fit.state, "tuition_only");
  assert.equal(fit.complete, false);
  assert.equal(fit.annualTotalUsd, null, "unknown living is not 0");
  assert.equal(fit.withinBudget, null);
  assert.equal(fit.tuitionWithinBudget, true);
  assert.deepEqual(fit.missing, ["living"]);
});

check("tuition over budget is reported even when living is unknown", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 9000, livingUsd: null, budgetUsd: 3000 });
  assert.equal(fit.state, "tuition_over");
  assert.equal(fit.withinBudget, null);
  assert.equal(fit.tuitionGapUsd, 6000);
});

check("a complete total that fits gives one positive verdict", () => {
  const fit = evaluateBudgetFit({ tuitionUsd: 3000, livingUsd: 1000, budgetUsd: 5000 });
  assert.equal(fit.state, "total_fits");
  assert.equal(fit.withinBudget, true);
  assert.equal(fit.annualTotalUsd, 4000);
  assert.equal(fit.totalGapUsd, -1000);
});

check("unknown tuition / budget / negative values never become zero", () => {
  assert.equal(evaluateBudgetFit({ tuitionUsd: null, livingUsd: 500, budgetUsd: 1000 }).state, "unknown");
  assert.equal(evaluateBudgetFit({ tuitionUsd: 1000, livingUsd: 500, budgetUsd: null }).state, "unknown");
  assert.equal(evaluateBudgetFit({ tuitionUsd: -1, livingUsd: 500, budgetUsd: 1000 }).tuitionUsd, null);
  assert.equal(evaluateBudgetFit({ tuitionUsd: 1000, livingUsd: NaN, budgetUsd: 1000 }).withinBudget, null);
  assert.equal(evaluateBudgetFit({ tuitionUsd: 1000, livingUsd: 0, budgetUsd: 0 }).budgetUsd, 0);
});

check("extra explicitly known annual lines are included and listed", () => {
  const fit = evaluateBudgetFit({
    tuitionUsd: 3000, livingUsd: 15000, budgetUsd: 20000,
    extraAnnualLines: [{ key: "insurance", annualUsd: 1200 }, { key: "books", annualUsd: 800 }],
  });
  assert.equal(fit.annualTotalUsd, 20000);
  assert.deepEqual(fit.lines.map((l) => l.key), ["tuition", "living", "insurance", "books"]);
  assert.equal(fit.withinBudget, true);
});

console.log("\nP1 — the same logic on card, compare sheet and recommendations");

check("the decision pill uses the shared verdict and says what is included", () => {
  const decision = evaluateUniversityDecision(
    { id: 1, annualTuitionUsd: 3000, annualLivingEstUsd: 15000 },
    { budgetAnnualUsd: 3000 },
  );
  assert.equal(decision.budget.withinBudget, false);
  assert.equal(decision.budget.state, "total_over");
  assert.equal(decision.pills[1].stateKey, "gap");
  assert.equal(decision.pills[1].params.gap, 15000);
  assert.equal(decision.pills[1].hintParams.total, 18000);

  const incomplete = evaluateUniversityDecision({ id: 2, annualTuitionUsd: 3000 }, { budgetAnnualUsd: 3000 });
  assert.equal(incomplete.pills[1].stateKey, "tuitionOnly");
  assert.equal(incomplete.budget.withinBudget, null);

  const tuitionOver = evaluateUniversityDecision({ id: 3, annualTuitionUsd: 9000 }, { budgetAnnualUsd: 3000 });
  assert.equal(tuitionOver.pills[1].stateKey, "tuitionGap");
});

check("the compare sheet never calls a partial cost 'within budget'", () => {
  const result = compareUniversities([
    { id: 11, name: "Full", annualTuitionUsd: 3000, annualLivingEstUsd: 15000 },
    { id: 12, name: "Partial", annualTuitionUsd: 3000, annualLivingEstUsd: null },
  ], { budgetAnnualUsd: 3000 });
  const row = result.rows.find((r) => r.key === "budgetFit")!;
  assert.match(String(row.values[11]), /over budget/);
  assert.equal(row.values[12], null);
});

check("card, compare and recommender all import the shared engine", () => {
  assert.match(read("src/lib/decisionPills.ts"), /evaluateBudgetFit/);
  assert.match(read("src/lib/compare.ts"), /evaluateBudgetFit/);
  assert.match(read("src/lib/recommend.ts"), /evaluateBudgetFit/);
  assert.match(read("src/components/DecisionPillStrip.tsx"), /budgetBreakdown/, "the arithmetic is visible");
  assert.match(read("src/lib/costs.ts"), /unknowns/, "the financial plan still reports unknown lines");
});

check("the detailed financial plan agrees with the shared budget verdict", () => {
  const complete = calculateCosts({
    annualTuitionUsd: 3000,
    annualLivingEstUsd: 15000,
    accommodationCostUsd: null,
    insurancePerYearUsd: 0,
    booksPerYearUsd: 0,
    flightsPerYearUsd: 0,
    visaFeeUsd: 0,
    applicationFeeUsd: 0,
    years: 1,
    familyContributionUsd: 3000,
  });
  assert.equal(complete.annualTotalUsd, 18000);
  assert.equal(complete.net.gapAnnualUsd, 15000);
  assert.equal(complete.net.affordable, false, "tuition fitting a 3k budget is not affordability");

  const partial = calculateCosts({
    annualTuitionUsd: 3000,
    annualLivingEstUsd: null,
    familyContributionUsd: 3000,
  });
  assert.equal(partial.annualTotalUsd, null, "an unknown living cost is not zero");
  assert.equal(partial.net.affordable, null);
});

check("planning and recommendation UIs keep the tri-state verdict", () => {
  const planning = read("src/components/PlanningStudio.tsx");
  assert.match(planning, /affordable === true[\s\S]*affordable === false/);
  assert.match(planning, /annualTotalUsd == null/, "incomplete totals are visibly unknown");
  const rec = read("src/components/RecommendationStudio.tsx");
  assert.match(rec, /withinBudget === "yes"/);
  assert.match(rec, /affordabilityUnknown/);
  assert.match(read("src/lib/recommend.ts"), /budgetVerdict\(budgetFit\)/);
});

check("UZ/RU/EN copy separates 'only tuition fits' from 'total fits'", () => {
  for (const lang of ["en", "uz", "ru"]) {
    const messages = read(`src/i18n/messages/${lang}.json`);
    assert.match(messages, /"tuitionOnly"/);
    assert.match(messages, /"tuitionOnlyHint"/);
    assert.match(messages, /"tuitionGap"/);
    assert.match(messages, /"budgetBreakdown"/);
    assert.match(messages, /"catalogueFigureNote"/);
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
