/**
 * Platform-wide evidence / admission-probability policy regression guard.
 *
 * It does not prove production data correctness. It proves the single policy
 * module, rendered public copy, typed evidence migration and refresh rule stay
 * consistent. Run: npm run test:evidence-policy
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ADMISSION_PROBABILITY_POLICY,
  ADMISSION_PROBABILITY,
  EVIDENCE_FIELDS,
  canDisplayAsAdmissionProbability,
  looksLikeProbabilityClaim,
  mayRefreshVerifiedDate,
  missingEvidenceFields,
  type CatalogueFact,
} from "../src/lib/evidencePolicy";
import { ADMISSION_PROBABILITY as CHANCING_PROBABILITY } from "../src/lib/chancing";

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

function sqlOnly(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}

console.log("\nEvidence / probability policy — repository guard");

check("one shared policy disables personal admission probability", () => {
  assert.equal(ADMISSION_PROBABILITY_POLICY.available, false);
  assert.equal(ADMISSION_PROBABILITY_POLICY.reason, "no-validated-methodology");
  assert.equal(ADMISSION_PROBABILITY.available, false);
  assert.deepEqual(CHANCING_PROBABILITY, ADMISSION_PROBABILITY);
  assert.equal(ADMISSION_PROBABILITY_POLICY.calibratedModelAvailable, false);
});

check("a fit / coverage / experimental / historical metric is never a personal probability", () => {
  for (const valueType of ADMISSION_PROBABILITY_POLICY.distinctMetricTypes) {
    const fact: CatalogueFact = {
      entityType: "university",
      entityId: 1,
      fieldKey: "fit_score",
      valueNumeric: 73,
      unit: "0-100 score",
      currency: null,
      period: null,
      degreeLevel: "Bachelor",
      programName: "General",
      admissionCycle: "2026-27",
      sourceUrl: "https://example.com",
      verifiedAt: "2026-11-06T00:00:00Z",
      verificationStatus: "verified",
      valueType,
    };
    assert.equal(canDisplayAsAdmissionProbability(fact), false, `${valueType} must not become probability`);
  }
  const impossible: CatalogueFact = {
    entityType: "university",
    entityId: 1,
    fieldKey: "admission_probability",
    valueNumeric: 73,
    unit: "percent",
    degreeLevel: "Bachelor",
    programName: "General",
    admissionCycle: "2026-27",
    sourceUrl: "https://example.com",
    verifiedAt: "2026-11-06T00:00:00Z",
    verificationStatus: "verified",
    valueType: "personal_admission_probability",
  };
  assert.equal(canDisplayAsAdmissionProbability(impossible), false);
});

check("important values require the full evidence field set", () => {
  assert.deepEqual(EVIDENCE_FIELDS.slice(), [
    "value", "unit", "currency", "period", "degreeLevel", "programName",
    "admissionCycle", "sourceUrl", "verifiedAt", "verificationStatus", "valueType",
  ]);
  const full: CatalogueFact = {
    entityType: "scholarship",
    entityId: 894,
    fieldKey: "award_amount",
    valueNumeric: 5040,
    unit: "CNY",
    currency: "CNY",
    period: "month",
    degreeLevel: "Master",
    programName: "Yenching Academy Fellowship",
    admissionCycle: "2027",
    sourceUrl: "https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm",
    verifiedAt: "2026-11-06T00:00:00Z",
    verificationStatus: "review_needed",
    valueType: "unverified",
  };
  assert.deepEqual(missingEvidenceFields(full), []);
  const incomplete: CatalogueFact = {
    entityType: "university",
    entityId: 1,
    fieldKey: "min_gpa",
    verificationStatus: "review_needed",
    valueType: "unverified",
  };
  const missing = missingEvidenceFields(incomplete);
  for (const field of ["value", "unit", "degreeLevel", "programName", "admissionCycle", "sourceUrl", "verifiedAt"]) {
    assert.ok(missing.includes(field), `expected missing ${field}`);
  }
});

check("a failed or date-only refresh never advances verifiedAt", () => {
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: false, verificationSucceeded: true, evidencePresent: true }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: false, evidencePresent: true }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: true, evidencePresent: false }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: true, evidencePresent: true }), true);
});

check("EN/UZ/RU public features no longer claim a personal admission chance", () => {
  const expectedBodies: Record<string, string> = {
    en: "No validated personal admission-probability model",
    uz: "Tasdiqlangan shaxsiy qabul ehtimoli modeli yo‘q",
    ru: "Проверенной модели индивидуальной вероятности нет",
  };
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, unknown>;
    const pf = messages.publicFeatures as Record<string, any>;
    assert.ok(pf, `${locale}.publicFeatures missing`);
    const strings = collectStrings(pf).join("\n");
    assert.equal(looksLikeProbabilityClaim(strings), false, `${locale} publicFeatures still claims probability`);
    assert.ok(pf.features.chancing.body.includes(expectedBodies[locale]), `${locale} chancing body lacks explicit policy`);
    assert.doesNotMatch(strings, /(Kirish imkoniyati|Admission chance|Шанс поступления)\s*[:=]?\s*\d{1,3}\s?%/i);
  }
});

check("the retired Safety/Target/Reach band labels are gone from every locale", () => {
  // The bands were deleted with the legacy engine, so the guard asserts the
  // absence of the whole vocabulary rather than checking strings that no longer
  // exist. A comeback — under any locale — fails here.
  // Only the retired BAND vocabulary, not the word "probability": legitimate
  // policy copy ("probability is not provided") is full of that word on purpose.
  const banned = /Safety \/ Likely|Target \/ Match|High Reach \/ Ultra|Ehtimolli[^.]{0,20}band|Сверхселективн/i;
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, unknown>;
    const chancing = (messages.chancing ?? {}) as Record<string, unknown>;
    for (const key of ["selectSafety", "selectTarget", "selectReach", "selectHighReach", "chanceBadgeLabel", "chanceAdmitRate"]) {
      assert.equal(key in chancing, false, `${locale}.chancing.${key} came back`);
    }
    const strings = collectStrings(messages).join("\n");
    assert.doesNotMatch(strings, banned, `${locale} reintroduced a selectivity band label`);
  }
});

check("features page and frontend contain no probability claim or service-role secret", () => {
  const featuresPage = read("src/app/features/page.tsx");
  assert.equal(looksLikeProbabilityClaim(featuresPage), false);
  assert.doesNotMatch(featuresPage, /admission chance|qabul ehtimolini hisoblaydi|шанс поступления оценивается/i);
  const frontendFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) frontendFiles.push(rel);
    }
  };
  walk("src");
  for (const file of frontendFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /sb_secret_|SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/i, `${file} may expose a secret`);
  }
});

check("typed evidence + durable queue migration exists and has no auth.uid() policy", () => {
  const migration = read("supabase/security_evidence_research_2026-11-06.sql");
  assert.match(migration, /NOT APPLIED BY THE AGENT/);
  assert.match(migration, /ALTER TABLE public\.password_reset_tokens ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON public\.password_reset_tokens FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON storage\.objects FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT ON storage\.objects TO anon, authenticated/);
  assert.match(migration, /FOR SELECT TO public\s*\n?\s*USING \(bucket_id = 'LOGO'\)/);
  for (const column of [
    "value_numeric", "value_text", "unit", "currency", "period", "degree_level",
    "program_name", "admission_cycle", "source_url", "verified_at",
    "verification_status", "value_type",
  ]) assert.ok(migration.includes(column), `catalogue_facts missing ${column}`);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.research_runs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.research_run_items/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'status_from_existing_dates'/);
  assert.match(migration, /official_source_reverification/);
  // Comments explain why auth.uid() is NOT used; executable SQL must not use it.
  assert.doesNotMatch(sqlOnly(migration), /auth\.uid\(/);
  assert.doesNotMatch(migration, /sb_secret_|eyJhbGciOi/i);
});

check("no new migration copies auth.uid() into HMAC/numeric-profile-ID design", () => {
  for (const file of [
    "supabase/official_source_corrections_2026-11-06.sql",
    "supabase/security_evidence_research_2026-11-06.sql",
  ]) assert.doesNotMatch(sqlOnly(read(file)), /auth\.uid\(/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
