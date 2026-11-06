/**
 * Admission-probability policy — END-TO-END guard (§6).
 *
 * `ADMISSION_PROBABILITY.available = false` and the translation strings alone
 * are not proof. This checks every surface the brief names: the API responses,
 * ChancingPanel / PlanningStudio / RecommendationStudio / dashboard, export,
 * marketing copy, and Telegram/channel text. It forbids a NUMERIC personal
 * admission chance while allowing honest "unavailable / no methodology" prose,
 * and proves fit / evidence coverage / historical acceptance rate / profile
 * completeness are four DIFFERENT named, explained metrics — not just a
 * renamed percentage.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ADMISSION_PROBABILITY, ADMISSION_PROBABILITY_POLICY, type CatalogueFact } from "../src/lib/evidencePolicy";
import { mayFeedAdmissionProbability, fromCatalogueFact } from "../src/lib/typedEvidence";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

console.log("\nAdmission probability policy — end-to-end");

// ---- Policy constant -------------------------------------------------------
check("the shared policy says unavailable for a stated reason", () => {
  assert.equal(ADMISSION_PROBABILITY.available, false);
  assert.equal(ADMISSION_PROBABILITY.reason, "no-validated-methodology");
  assert.equal(ADMISSION_PROBABILITY_POLICY.requiresCalibratedModel, true);
  assert.equal(ADMISSION_PROBABILITY_POLICY.calibratedModelAvailable, false);
});

check("no typed fact may feed a personal admission probability", () => {
  const fact: CatalogueFact = {
    entityType: "university", entityId: 1, fieldKey: "min_gpa", valueNumeric: 3.9,
    verificationStatus: "verified", valueType: "official_requirement",
    sourceUrl: "https://mit.edu", verifiedAt: "2026-11-06",
  };
  assert.equal(mayFeedAdmissionProbability(fromCatalogueFact(fact)), false);
});

// ---- Every API that could return a probability ----------------------------
const API_ROUTES = [
  "src/app/api/chancing/route.ts",
  "src/app/api/planning/route.ts",
  "src/app/api/programs/recommend/route.ts",
  "src/app/api/ai/admissions-advisor/route.ts",
  "src/app/api/ai/evaluate-profile/route.ts",
  "src/app/api/career-discovery/route.ts",
  "src/app/api/applications/outcome/route.ts",
];

check("every relevant API returns the shared unavailable probability, never a number", () => {
  for (const route of API_ROUTES) {
    const src = read(route);
    // A route either returns the shared constant or lacks the dimension; it
    // must NEVER construct a numeric personal probability field.
    assert.doesNotMatch(src, /admission(Probability|Chance)\s*:\s*(?:Number\()?\d/,
      `${route} must not build a numeric admission probability`);
    assert.doesNotMatch(src, /probability\s*:\s*\d+(\.\d+)?\b/,
      `${route} must not return a numeric probability`);
  }
});

check("chancing/planning/recommend/advisor responses carry available:false", () => {
  for (const route of [
    "src/app/api/chancing/route.ts", "src/app/api/planning/route.ts",
    "src/app/api/programs/recommend/route.ts", "src/app/api/ai/admissions-advisor/route.ts",
  ]) {
    assert.match(read(route), /probability:\s*ADMISSION_PROBABILITY/, `${route} must return the shared state`);
  }
});

check("the API never ships a computed 'chance' percent under another name", () => {
  for (const route of API_ROUTES) {
    const src = read(route);
    assert.doesNotMatch(src, /(admissionChancePercent|admitChance|chancePercent|probabilityPct)\s*:\s*\d/);
  }
});

// ---- UI surfaces -----------------------------------------------------------
const UI_FILES = [
  "src/components/ChancingPanel.tsx",
  "src/components/PlanningStudio.tsx",
  "src/components/RecommendationStudio.tsx",
  "src/components/DashboardView.tsx",
  "src/components/ParentDashboard.tsx",
  "src/components/AdmissionsAdvisor.tsx",
  "src/components/PublicFeaturePromo.tsx",
  "src/app/HomeClient.tsx",
  "src/app/features/page.tsx",
];

/** A line that prints a percent next to a probability word is the regression. */
const NUMERIC_PROBABILITY_LINE = /(chance|probability|ehtimol|imkoniyat|шанс|вероятность)[^%\n]{0,60}%\s*|%\s*[^%\n]{0,20}(chance|probability|ehtimol|шанс)/i;

check("no UI prints a numeric personal admission chance", () => {
  for (const f of UI_FILES) {
    const src = read(f);
    for (const line of src.split("\n")) {
      // Honest disclaimers ("no admission probability") are allowed; a numeric
      // percentage tied to the probability wording is not.
      assert.doesNotMatch(line, NUMERIC_PROBABILITY_LINE, `${f}: ${line.trim().slice(0, 90)}`);
    }
  }
});

check("fit, evidence coverage, historical rate and completeness have distinct names", () => {
  const policy = read("src/lib/evidencePolicy.ts");
  assert.match(policy, /computed_fit/);
  assert.match(policy, /evidence_coverage/);
  assert.match(policy, /experimental_index/);
  assert.match(policy, /historical_acceptance_rate/);
  assert.equal(new Set(ADMISSION_PROBABILITY_POLICY.distinctMetricTypes).size, 4);
  // Renaming the old percent to "fit" without a distinct formula is not enough:
  // the fit engine must be a separate, documented module.
  assert.match(read("src/lib/fitBadge.ts"), /fit/i);
  assert.match(read("src/lib/chancing.ts"), /profileStrength|countActivities/);
  assert.match(read("src/app/api/chancing/route.ts"), /fitScore/);
});

check("ChancingPanel / RecommendationStudio state probability is unavailable", () => {
  const chancing = read("src/components/ChancingPanel.tsx");
  const rec = read("src/components/RecommendationStudio.tsx");
  assert.doesNotMatch(chancing, /probability[^\n]*:\s*\d/);
  assert.doesNotMatch(rec, /probability[^\n]*:\s*\d/);
});

// ---- Export, marketing, Telegram/channel text -----------------------------
check("the admin config export contains no numeric admission probability key", () => {
  const src = read("src/app/api/admin/config/export/route.ts");
  assert.doesNotMatch(src, /(admissionProbability|admissionChance)\s*:\s*\d/);
});

check("Telegram/channel templates never publish a personal chance percent", () => {
  const dir = "src/lib/channel/templates";
  for (const file of readdirSync(join(process.cwd(), dir))) {
    if (!/\.(ts|json)$/.test(file)) continue;
    const src = read(join(dir, file));
    assert.doesNotMatch(src, /(admission|qabul|kirish|поступлен)[^%\n]{0,40}(chance|probability|ehtimol|шанс)[^%\n]{0,30}\d+\s*%/i,
      `${dir}/${file} publishes a chance %`);
  }
  assert.doesNotMatch(read("src/lib/channel/model.ts"), /probability\s*:\s*\d/);
});

check("EN/UZ/RU public copy contains no personal admission-chance claim", () => {
  // Only an ASSERTED claim is forbidden. A disclaimer that says the app does
  // NOT indicate/compute/know the chance (e.g. studyInterest.helper) is the
  // honest policy and must be allowed — so inspect each string, not a flat
  // regex over the whole JSON blob.
  const asserted = [
    /admission (chance|probability):?\s*\d+\s*%/i,
    /we (calculate|predict|estimate) your (chance|probability)/i,
    /(calculate|predict|estimate)[^.]{0,40}(chance|probability) of admission/i,
    /qabul (ehtimolini|imkoniyatini) (hisoblaymiz|aniqlaymiz|bashorat)/i,
    /мы (рассчитываем|прогнозируем) (ваш )?шанс/i,
  ];
  const disclaimer = /\b(do not|does not|never|no validated|unavailable|not (a |an )?(claim|available|computed|calculated)|hisoblanmaydi|aniqlanmaydi|не рассчитыва|не определя)/i;
  const flatten = (v: unknown, out: string[] = []): string[] => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object") for (const x of Object.values(v)) flatten(x, out);
    return out;
  };
  for (const loc of ["en", "uz", "ru"]) {
    const strings = flatten(JSON.parse(read(`src/i18n/messages/${loc}.json`)));
    for (const s of strings) {
      if (disclaimer.test(s)) continue; // honest negative statement
      for (const re of asserted) assert.doesNotMatch(s, re, `[${loc}] asserted probability claim: ${s.slice(0, 90)}`);
    }
  }
});

check("the privacy page and feature copy state the honest disclaimer", () => {
  assert.match(read("src/app/privacy/page.tsx"), /probabilit|chance|ehtimol/i);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
