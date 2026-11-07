import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasSpecificEvidenceUrl, hasVerifiedProgramEvidence } from "../src/lib/catalogEvidence";
import { recommend, type RecommendProgram, type RecommendationCatalog } from "../src/lib/recommend";

for (const url of [null, "", "https://example.edu", "https://example.edu/", "https://example.edu/?programme=cs", "javascript:alert(1)", "not a URL"]) {
  assert.equal(hasSpecificEvidenceUrl(url), false, String(url));
}
assert.equal(hasSpecificEvidenceUrl("https://example.edu/programs/cs/"), true);
assert.equal(hasVerifiedProgramEvidence({ sourceUrl: "https://example.edu/programs/cs", verificationStatus: "verified", isVerified: true }), true);
assert.equal(hasVerifiedProgramEvidence({ sourceUrl: "https://example.edu/programs/cs", verificationStatus: "unverified", isVerified: true }), false);
assert.equal(hasVerifiedProgramEvidence({ sourceUrl: "https://example.edu/programs/cs", verificationStatus: "verified", isVerified: false }), false);
assert.equal(hasVerifiedProgramEvidence({ sourceUrl: "https://example.edu/", verificationStatus: "verified" }), false);

const program: RecommendProgram = {
  id: 1, universityId: 1, name: "CS", field: "Computer Science", degreeLevel: "Bachelor",
  annualTuition: 1000, durationYears: 4, durationUnit: "years", tuitionCurrency: "USD", tuitionPeriod: "year",
  studyMode: "Full-time", language: "English", programUrl: "https://example.edu/programs/cs", applicationUrl: null,
  isVerified: true, verificationStatus: "verified", sourceUrl: "https://example.edu/programs/cs", lastVerifiedAt: null, sources: [],
};
function catalog(p: RecommendProgram): RecommendationCatalog {
  return {
    programs: [p], requirements: new Map(), cycles: new Map(), scholarships: [],
    universities: new Map([[1, { id: 1, name: "University", country: "Test", city: null, websiteUrl: "https://example.edu", annualLivingEst: 1000, livingCostCurrency: "USD" }]]),
  };
}
const input = { interests: ["Computer Science"], budgetUsd: 5000 };
const verified = recommend(input, catalog(program))[0];
assert.equal(verified.affordability.withinBudget, "yes");
for (const p of [
  { ...program, verificationStatus: "unverified", isVerified: false },
  { ...program, sourceUrl: "https://example.edu/" },
]) {
  const result = recommend(input, catalog(p))[0];
  assert.equal(result.program.id, program.id); // Discovery identity stays visible.
  assert.equal(result.program.annualTuition, null);
  assert.equal(result.program.durationYears, null);
  assert.equal(result.program.verificationStatus, "unverified");
  assert.equal(result.affordability.withinBudget, "unknown");
}
assert.equal(program.annualTuition, 1000); // No mutation of raw catalogues.

const api = readFileSync("src/app/api/programs/recommend/route.ts", "utf8");
// Whole-row programme flags must not grant authority to legacy minima. The
// live route now resolves each scoped typed field independently; the real API
// continuation test also proves an unverified legacy row grants no cutoff.
assert.match(api, /loadCatalogueFacts\("program", programIds\)/);
assert.match(api, /mayAutoReject\(value\)/);
assert.match(api, /isVerifiedOfficialRequirement\(group\)/);
assert.doesNotMatch(api, /minIelts:\s*r\.minIelts| minToefl:\s*r\.minToefl/);
assert.match(api, /from\(applicationCycles\)\.where\(eq\(applicationCycles\.isActive, true\)\)/);
const detail = readFileSync("src/app/api/universities/[id]/route.ts", "utf8");
assert.match(detail, /eq\(applicationCycles\.isActive, true\)/);
assert.match(detail, /eq\(universityPrograms\.isActive, true\)/);
assert.match(detail, /const programVerified = hasVerifiedProgramEvidence\(p\)/);
const deadlines = readFileSync("src/app/api/deadlines/route.ts", "utf8");
assert.match(deadlines, /eq\(applicationCycles\.isActive, true\)/);
const integrity = readFileSync("scripts/check-deadline-integrity.ts", "utf8");
assert.doesNotMatch(integrity, /verified deadline is never in the past/);
assert.match(integrity, /opening_date > deadline/);
console.log("✓ Evidence URL checks, quarantine projection, unknown affordability, immutable originals and archived-cycle boundaries passed");
