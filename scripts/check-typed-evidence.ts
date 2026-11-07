/**
 * Typed evidence end-to-end guard (§4, §6, §13).
 *
 * Proves the field-level trust adapter keeps every legacy number visible while
 * never upgrading its trust. This is the transition layer the report said was
 * missing: catalogue_facts existed, but nothing consumed it. Here the SAME
 * adapter is imported by the dashboard API (gpaOk), and the guard checks the
 * whole surface.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fromCatalogueFact, adaptLegacyField, mergeEvidence, isOfficialMinimum,
  mayAutoReject, mayFeedAdmissionProbability, eligibilityCutoff, trustLabel,
} from "../src/lib/typedEvidence";
import { ADMISSION_PROBABILITY, type CatalogueFact } from "../src/lib/evidencePolicy";
import { presentFact, presentFactLine, legacyEvidence } from "../src/lib/factPresentation";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

console.log("\nTyped evidence — field-level trust across the product");

const base: CatalogueFact = {
  publisherOfficial: true,
  entityType: "university", entityId: 1, fieldKey: "min_ielts",
  valueNumeric: 7.0, unit: "IELTS band", degreeLevel: "Master",
  admissionCycle: "2027 intake", sourceUrl: "https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm",
  verifiedAt: "2026-11-06", verificationStatus: "review_needed", valueType: "official_requirement",
};

check("a typed official requirement with a passed field check is an official minimum", () => {
  const verified: CatalogueFact = { ...base, verificationStatus: "verified" };
  const v = fromCatalogueFact(verified);
  assert.equal(v.trust, "official_verified");
  assert.equal(isOfficialMinimum(v), true);
  assert.equal(mayAutoReject(v), true);
  assert.equal(v.value, 7.0);
});

check("the SAME number with review_needed is NOT an official minimum and cannot reject", () => {
  const v = fromCatalogueFact(base);
  assert.equal(v.value, 7.0, "the number is kept, not hidden");
  assert.equal(v.trust, "official_unverified");
  assert.equal(isOfficialMinimum(v), false);
  assert.equal(mayAutoReject(v), false);
});

check("university.verified=true does NOT verify a legacy field", () => {
  const legacy = adaptLegacyField({ fieldKey: "min_gpa", value: 3.91, entityVerified: true });
  assert.equal(legacy.value, 3.91, "the useful number survives the transition");
  assert.equal(legacy.trust, "legacy_unknown");
  assert.equal(isOfficialMinimum(legacy), false);
  assert.equal(mayAutoReject(legacy), false);
  assert.match(trustLabel(legacy), /field-level evidence missing/);
});

check("official minimum / observed average / third-party estimate / computed stay distinct", () => {
  const observed = fromCatalogueFact({ ...base, valueType: "observed_statistic", verificationStatus: "verified" });
  const estimate = fromCatalogueFact({ ...base, valueType: "planning_estimate", verificationStatus: "verified" });
  const computed = fromCatalogueFact({ ...base, valueType: "computed_fit", verificationStatus: "verified" });
  assert.equal(observed.trust, "observed");
  assert.equal(estimate.trust, "third_party_estimate");
  assert.equal(computed.trust, "computed");
  assert.equal(isOfficialMinimum(observed), false, "an observed average is not an official minimum");
  assert.equal(isOfficialMinimum(estimate), false);
  assert.equal(isOfficialMinimum(computed), false);
  assert.notEqual(observed.valueType, estimate.valueType);
});

check("no value can feed a personal admission probability (no validated methodology)", () => {
  assert.equal(ADMISSION_PROBABILITY.available, false);
  assert.equal(mayFeedAdmissionProbability(fromCatalogueFact({ ...base, verificationStatus: "verified" })), false);
  assert.equal(mayFeedAdmissionProbability(fromCatalogueFact({ ...base, valueType: "personal_admission_probability" })), false);
});

check("an unknown value stays unknown — not zero, not 'not applicable'", () => {
  const v = adaptLegacyField({ fieldKey: "min_ielts", value: null, entityVerified: true });
  assert.equal(v.value, null);
  assert.equal(v.trust, "unknown");
  assert.equal(isOfficialMinimum(v), false);
  const na = fromCatalogueFact({ ...base, valueType: "not_applicable", valueNumeric: null, valueText: null });
  assert.equal(na.trust, "unknown");
});

check("merging prefers typed evidence but KEEPS the legacy number for display", () => {
  const legacy = { fieldKey: "min_ielts", value: 6.5, entityVerified: true };
  const merged = mergeEvidence(base, legacy);
  assert.equal(merged.usedTyped, true);
  assert.equal(merged.primary.trust, "official_unverified");
  assert.equal(merged.legacy.value, 6.5, "no useful information is hidden during migration");
  const noTyped = mergeEvidence(null, legacy);
  assert.equal(noTyped.usedTyped, false);
  assert.equal(noTyped.primary.trust, "legacy_unknown");
});

check("eligibilityCutoff refuses to reject on any unverified/legacy/observed minimum", () => {
  const student = 3.5;
  for (const minimum of [
    adaptLegacyField({ fieldKey: "min_gpa", value: 3.91, entityVerified: true }),
    fromCatalogueFact({ ...base, valueNumeric: 3.91, fieldKey: "min_gpa", verificationStatus: "review_needed" }),
    fromCatalogueFact({ ...base, valueNumeric: 3.91, fieldKey: "min_gpa", valueType: "observed_statistic", verificationStatus: "verified" }),
  ]) {
    const verdict = eligibilityCutoff({ studentValue: student, minimum });
    assert.equal(verdict.canEvaluate, false);
    assert.equal(verdict.passes, null);
    assert.match(verdict.reason, /cannot auto-reject|not a verified/i);
  }
});

check("a verified official minimum MAY evaluate, and a real shortfall can fail", () => {
  const verified = fromCatalogueFact({
    ...base, fieldKey: "min_gpa", valueNumeric: 3.91, verificationStatus: "verified", valueType: "official_requirement",
  });
  assert.equal(eligibilityCutoff({ studentValue: 3.95, minimum: verified }).passes, true);
  assert.equal(eligibilityCutoff({ studentValue: 3.2, minimum: verified }).passes, false);
  assert.equal(eligibilityCutoff({ studentValue: null, minimum: verified }).canEvaluate, false);
});

// ---- Static wiring: the adapter is actually consumed ----------------------
check("the dashboard API consumes the adapter and never hard-rejects on legacy minGpa", () => {
  const dash = read("src/app/api/dashboard/route.ts");
  assert.match(dash, /from "@\/lib\/typedEvidence"/);
  assert.match(dash, /eligibilityCutoff/);
  assert.match(dash, /gpaCutoffTrusted: false/, "no legacy column is presented as verified");
  // A plain `gpa >= s.minGpa` auto-reject must be gone.
  assert.doesNotMatch(dash, /gpaOk: s\.minGpa == null \|\| gpa == null \|\| gpa >= s\.minGpa/);
});

check("the UI states that an unverified minimum is not used to reject", () => {
  const ui = read("src/components/journey/JourneyControlCenter.tsx");
  assert.match(ui, /ccGpaUnverified/);
  assert.match(ui, /gpaCutoffTrusted/);
  for (const loc of ["en", "uz", "ru"]) {
    assert.match(read(`src/i18n/messages/${loc}.json`), /ccGpaUnverified/);
  }
});

// ---- §4: one presentation envelope consumed by EVERY surface ------------
check("presentFact keeps every typed field and never upgrades trust", () => {
  const unverified = fromCatalogueFact(base); // review_needed official_requirement
  const p = presentFact(unverified, "IELTS");
  assert.equal(p.value, 7.0);
  assert.equal(p.isOfficialMinimum, false);
  assert.equal(p.displayAs, "unverified_value");
  assert.doesNotMatch(p.label, /official minimum/i, "no unverified value is labelled a minimum");
  assert.equal(p.unit, "IELTS band");
  assert.equal(p.degreeLevel, "Master");
  assert.equal(p.admissionCycle, "2027 intake");
  assert.equal(p.sourceUrl, "https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm");
  assert.equal(p.verifiedAt, "2026-11-06");
  assert.equal(p.verificationStatus, "review_needed");
  assert.equal(p.valueType, "official_requirement");
  assert.equal(p.isUnknown, false);
});

check("a verified official fact is the ONLY one labelled 'official minimum'", () => {
  const v = presentFact(fromCatalogueFact({ ...base, verificationStatus: "verified" }), "IELTS");
  assert.equal(v.displayAs, "official_minimum");
  assert.match(v.label, /official minimum/i);
  for (const other of ["observed_statistic", "planning_estimate", "computed_fit"] as const) {
    const p = presentFact(fromCatalogueFact({ ...base, valueType: other, verificationStatus: "verified" }), "IELTS");
    assert.notEqual(p.displayAs, "official_minimum", `${other} must not become a requirement`);
  }
});

check("unknown stays unknown in presentation, never 0 / never 'not applicable'", () => {
  const p = presentFact(adaptLegacyField({ fieldKey: "min_ielts", value: null }), "IELTS");
  assert.equal(p.value, null);
  assert.equal(p.isUnknown, true);
  assert.equal(p.displayAs, "unknown");
  assert.match(presentFactLine(adaptLegacyField({ fieldKey: "min_ielts", value: null }), "IELTS"), /noma'lum/);
});

check("legacyEvidence keeps numbers but marks ALL fields legacy_unknown even when the entity is verified", () => {
  const env = legacyEvidence({
    entityVerified: true,
    sourceUrl: "https://www.mit.edu",
    fields: { minGpa: 3.91, minSat: 1520, acceptanceRate: 4.5, minIelts: null },
  });
  assert.equal(env.minGpa.value, 3.91, "useful legacy data is not hidden");
  assert.equal(env.minGpa.isOfficialMinimum, false);
  assert.equal(env.minSat.trust, "legacy_unknown");
  assert.equal(env.acceptanceRate.displayAs, "unverified_value");
  assert.equal(env.minIelts.isUnknown, true);
  assert.equal(env.minIelts.value, null);
});

check("the SAME envelope is wired into catalog, detail, grant, Telegram and dashboard", () => {
  assert.match(read("src/app/api/universities/route.ts"), /legacyEvidence/);
  assert.match(read("src/app/api/universities/[id]/route.ts"), /legacyEvidence/);
  assert.match(read("src/app/api/scholarships/route.ts"), /legacyEvidence/);
  assert.match(read("src/app/api/dashboard/route.ts"), /typedEvidence/);
  assert.match(read("src/lib/channel/templates/facts.ts"), /presentFact/);
  assert.match(read("src/lib/channel/templates/format.ts"), /factEvidenceLineUz/);
  // Telegram must not assert a bare `+` minimum from a legacy column.
  const card = read("src/lib/channel/templates/card.uz.ts");
  assert.doesNotMatch(card, /`IELTS \$\{facts\.minIelts\}\+`/);
  assert.doesNotMatch(card, /`GPA \$\{facts\.minGpa\}\+`/);
  assert.match(card, /minIeltsEvidenceLine|minGpaEvidenceLine/);
});

check("all typed evidence fields exist in the DDL and the policy", () => {
  const ddl = read("supabase/security_evidence_research_2026-11-06.sql");
  for (const col of ["value_numeric", "value_text", "unit", "currency", "period", "degree_level",
    "program_name", "admission_cycle", "source_url", "verified_at", "verification_status", "value_type"]) {
    assert.match(ddl, new RegExp(col), `catalogue_facts DDL missing ${col}`);
  }
  const policy = read("src/lib/evidencePolicy.ts");
  assert.match(policy, /EVIDENCE_FIELDS/);
  assert.match(policy, /missingEvidenceFields/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
