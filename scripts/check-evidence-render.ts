/**
 * §4 — the typed `evidence` envelope is RENDERED, not just returned by APIs.
 *
 * Two kinds of proof, because a source-regex alone is not enough:
 *   1. real server-rendered HTML from EvidenceNote (react-dom/server +
 *      NextIntlClientProvider) for legacy, unknown, official-minimum and an
 *      unsafe URL — asserting what the user actually sees;
 *   2. static wiring checks for every surface (catalog/grant/compare/admin),
 *      every API envelope and the EN/UZ/RU translation keys.
 *
 * Run: npm run test:evidence-render
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { EvidenceNote } from "../src/components/EvidenceNote";
import { legacyEvidence, presentFact, presentRaw, type PresentedFact } from "../src/lib/factPresentation";
import type { TrustedValue } from "../src/lib/typedEvidence";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}

const messages = JSON.parse(read("src/i18n/messages/en.json")) as Record<string, unknown>;
// The provider's public type requires `children` as a prop, while ESLint's
// react/no-children-prop requires it as createElement's 3rd argument. A local
// structural alias satisfies both without weakening the runtime messages.
const IntlProvider = NextIntlClientProvider as React.ComponentType<{
  locale: string; messages: unknown; timeZone: string;
}>;

function renderHtml(fact: PresentedFact | null | undefined, locale = "en"): string {
  const msgs = locale === "en" ? messages
    : JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, unknown>;
  return renderToStaticMarkup(
    React.createElement(
      IntlProvider,
      { locale, messages: msgs, timeZone: "UTC" },
      React.createElement(EvidenceNote, { fact, compact: true }),
    ),
  );
}

function officialFact(sourceUrl: string | null): PresentedFact {
  const v: TrustedValue = {
    value: 7, trust: "official_verified", valueType: "official_requirement",
    verificationStatus: "verified", unit: "IELTS Academic band", currency: null,
    period: null, degreeLevel: "Master", programName: "Yenching Academy",
    admissionCycle: "2027", sourceUrl, verifiedAt: "2026-11-06",
    note: "Official 2027-cohort page re-read.",
  };
  return presentFact(v, "IELTS");
}

console.log("\nTyped evidence — rendered UI proof");

// ---- 1. REAL rendered HTML -------------------------------------------------
check("RENDERED: a legacy 5040 value stays unverified even when the entity is verified", () => {
  const facts = legacyEvidence({ entityVerified: true, fields: { amountUsdValue: 5040 } });
  assert.ok(facts.amountUsdValue);
  const html = renderHtml(facts.amountUsdValue);
  assert.match(html, /Unverified value/, "the user sees an explicit unverified label");
  assert.match(html, /data-evidence-trust="legacy_unknown"/);
  assert.match(html, /data-evidence-display="unverified_value"/);
  assert.match(html, /no field-level source link/);
  assert.doesNotMatch(html, /Official minimum \(field-level verified\)/,
    "university.verified=true must NOT promote a field to an official minimum");
});

check("RENDERED: an unknown value says unknown, never zero", () => {
  const facts = legacyEvidence({ fields: { awardAmount: null } });
  const html = renderHtml(facts.awardAmount);
  assert.match(html, /No confirmed value in this scope — unknown, not zero/);
  assert.match(html, /data-evidence-display="unknown"/);
});

check("RENDERED: only a fully verified official requirement says 'minimum'", () => {
  const html = renderHtml(officialFact("https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm"));
  assert.match(html, /Official minimum \(field-level verified\)/);
  assert.match(html, /data-evidence-display="official_minimum"/);
  assert.match(html, /Admission cycle: 2027/);
  assert.match(html, /href="https:\/\/yenchingacademy\.pku\.edu\.cn\/ADMISSIONS\.htm"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

check("RENDERED: a javascript: source URL is never rendered as a link", () => {
  const html = renderHtml(officialFact("javascript:alert(1)"));
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /data-evidence-display="unverified_value"/, "unsafe source is never official but its value is kept");
});

check("RENDERED: a missing evidence object still shows an honest gap", () => {
  // §5: a raw number with NO metadata must NOT silently lose its caveat.
  for (const html of [renderHtml(null), renderHtml(undefined)]) {
    assert.match(html, /No field-level evidence is available/);
    assert.match(html, /data-evidence-trust="metadata_missing"/);
    assert.doesNotMatch(html, /Official minimum/);
  }
});

// ---- 2. Wiring across every surface ---------------------------------------
const surfaces: Array<[string, string]> = [
  ["grant / finance hub", "src/components/ScholarshipHub.tsx"],
  ["admin scholarships manager", "src/components/admin/ScholarshipsManager.tsx"],
  ["country comparison", "src/components/CountryComparePanel.tsx"],
];
for (const [label, file] of surfaces) {
  check(`${label} renders the shared EvidenceNote and declares the envelope type`, () => {
    const s = read(file);
    assert.match(s, /from "@\/components\/EvidenceNote"/, "shared component is imported");
    assert.match(s, /<EvidenceNote\b/, "component is actually rendered, not just imported");
    assert.match(s, /type \{ PresentedFact \}/, "typed envelope, not a loose any");
    assert.match(s, /evidence\?:/, "the client type declares the evidence envelope");
  });
}

check("all four catalog/grant/compare APIs attach the typed envelope", () => {
  for (const file of [
    "src/app/api/universities/route.ts",
    "src/app/api/universities/[id]/route.ts",
    "src/app/api/scholarships/route.ts",
    "src/app/api/countries/compare/route.ts",
  ]) {
    const s = read(file);
    assert.match(s, /legacyEvidence\(/, `${file} must build an evidence envelope`);
    assert.match(s, /evidence:/, `${file} must return it`);
  }
  // Compare averages are computed, NOT official minimums and NOT verified.
  const compare = read("src/app/api/countries/compare/route.ts");
  assert.match(compare, /entityVerified: false/, "an average must never inherit entity-level trust");
  assert.match(compare, /minIeltsAvg: c\.minIelts\.avg/);
});

check("EvidenceNote never upgrades trust and uses static, checkable t() keys", () => {
  // Strip prose comments: an explanatory example is not executable code.
  const s = read("src/components/EvidenceNote.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(s, /safeHttpUrl/);
  assert.match(s, /u\.protocol === "http:" \|\| u\.protocol === "https:"/);
  assert.match(s, /displayAs === "official_minimum"/);
  assert.doesNotMatch(s, /t\(LABEL_KEY|t\(key\)|t\([a-zA-Z]+\[/, "no dynamic translation key");
  for (const key of ["officialMinimum", "recommended", "legacyUnknown", "observed", "estimate", "computed", "unknown", "noMetadata", "noMetadataAtAll", "details"]) {
    assert.match(s, new RegExp(`t\\("${key}"\\)`), `static t("${key}") is verifiable`);
  }
});

check("EN/UZ/RU evidence namespaces have identical, non-empty keys", () => {
  const sets = ["en", "uz", "ru"].map((l) => {
    const d = JSON.parse(read(`src/i18n/messages/${l}.json`)) as { evidence?: Record<string, string> };
    assert.ok(d.evidence, `${l}.json is missing the evidence namespace`);
    assert.ok(Object.values(d.evidence).every((v) => typeof v === "string" && v.trim().length > 0));
    return Object.keys(d.evidence).sort();
  });
  assert.deepEqual(sets[0], sets[1], "UZ keys differ from EN");
  assert.deepEqual(sets[0], sets[2], "RU keys differ from EN");
  // Three explicit policy/group labels supplement, rather than replace, the
  // original 16 evidence keys. Exact parity remains required.
  assert.equal(sets[0].length, 19);
  for(const key of ["notPublishedConfirmed","notApplicableConfirmed","officialCriteria"])assert.ok(sets[0].includes(key));
});


check("§5 — all five remaining panels render EvidenceNote with an explicitly typed fact", () => {
  const expected: Record<string, [string, string]> = {
    "src/components/ApplicationTracker.tsx": ["legacy_unknown", "unverified"],
    "src/components/SimilarProfiles.tsx": ["observed", "observed_statistic"],
    // The chancing panel is a thin wrapper now; the assessment screen it mounts
    // is the surface that shows numbers, so the envelope guard follows it.
    "src/components/AssessmentParts.tsx": ["observed", "observed_statistic"],
    "src/components/FeeWaiverStudio.tsx": ["computed", "computed_fit"],
    "src/components/UniversityDetail.tsx": ["legacy_unknown", "unverified"],
  };
  for (const [file, [trust, valueType]] of Object.entries(expected)) {
    const src = read(file);
    assert.match(src, /import \{ EvidenceNote \} from "@\/components\/EvidenceNote"/, `${file} imports EvidenceNote`);
    assert.match(src, /presentRaw\(\{/, `${file} adapts its raw value through the shared presentation layer`);
    assert.match(src, /<EvidenceNote[\s\S]*?compact/, `${file} actually renders the note, not just an import`);
    assert.match(src, new RegExp(`trust:\\s*"${trust}"`), `${file} declares the correct trust`);
    assert.match(src, new RegExp(`valueType:\\s*"${valueType}"`), `${file} declares the correct value type`);
  }
});

check("§5 — a benchmark is never labelled an official minimum; a computed value never is either", () => {
  const observed = renderHtml(presentRaw({
    value: 6.5, fieldLabel: "IELTS benchmark", trust: "observed", valueType: "observed_statistic",
    note: "Cohort statistic, not a published requirement.",
  }));
  assert.match(observed, /observed/i);
  // The honest label contains "not an official minimum"; the ASSERTED claim
  // is what must be absent.
  assert.doesNotMatch(observed, /Official minimum \(field-level verified\)/i);
  assert.doesNotMatch(observed, /data-evidence-display="official_minimum"/);
  assert.match(observed, /data-evidence-trust="unverified"|data-evidence-trust="observed"/);
  assert.match(observed, /Cohort statistic, not a published requirement/);
  const computed = renderHtml(presentRaw({
    value: 92, fieldLabel: "Effective score", trust: "computed", valueType: "computed_fit",
  }));
  assert.match(computed, /computed/i);
  assert.doesNotMatch(computed, /Official minimum \(field-level verified\)/i);
  assert.doesNotMatch(computed, /data-evidence-display="official_minimum"/);
  const unknown = renderHtml(presentRaw({
    value: null, fieldLabel: "Award amount", trust: "legacy_unknown", valueType: "unverified",
  }));
  assert.match(unknown, /No confirmed value/i);
  assert.doesNotMatch(unknown, /Not published/i);
  // A lone rendered zero would mean "unknown became 0". CSS decimals such as
  // 0.5 are not rendered values, so check the value slot instead.
  assert.doesNotMatch(unknown, />\s*0\s*</);
  assert.match(unknown, /data-evidence-display="unknown"/);
  // presentRaw always emits an explicit note, so the visible gap is its
  // wording (not the generic noMetadata fallback).
  assert.match(unknown, /No confirmed value in this scope/i);
  assert.match(unknown, /no field-level source link/i);
});

check("§6 — a recommended score is rendered as recommended, never as a minimum/cutoff", () => {
  const v: TrustedValue = {
    value: 100, trust: "official_verified", valueType: "recommended_score",
    verificationStatus: "verified", unit: "TOEFL iBT (pre-1/21/26 scale)", currency: null,
    period: null, degreeLevel: null, programName: null, admissionCycle: "2027",
    sourceUrl: "https://mitadmissions.org/apply/firstyear/tests-scores/", verifiedAt: "2026-11-06",
    note: "Recommended, NOT a minimum. 90 is the minimum on the old scale.",
  };
  const fact = presentFact(v, "TOEFL");
  assert.equal(fact.displayAs, "recommended");
  assert.equal(fact.isOfficialMinimum, false);
  const html = renderHtml(fact);
  assert.match(html, /Recommended/i);
  assert.doesNotMatch(html, /Official minimum \(field-level verified\)/i);
  assert.doesNotMatch(html, /data-evidence-display="official_minimum"/);
  assert.match(html, /href="https:\/\/mitadmissions\.org\/apply\/firstyear\/tests-scores\/"/);
  assert.match(html, /NOT a minimum/);
});

check("§6 — internal eligibility tokens are never shown raw in the scholarship detail", () => {
  const src = read("src/app/scholarships/[id]/page.tsx");
  assert.match(src, /from "@\/lib\/eligibilityScope"/);
  assert.match(src, /parseEligibilityScope\(/);
  assert.match(src, /scopeValue\(/);
  assert.match(src, /v !== "\*" && v !== "__not_applicable__"/);
  // The only literal occurrences are the filter comparisons, never a rendered value.
  assert.doesNotMatch(src, /value=\{\[?"\*"/);
  assert.doesNotMatch(src, />\s*__not_applicable__\s*</);
  const dict = JSON.parse(read("src/i18n/messages/en.json")) as { eligibility?: { scope?: Record<string, string> } };
  for (const k of ["unknown", "unrestricted", "unrestricted_legacy", "not_applicable", "restricted"]) {
    assert.ok(dict.eligibility?.scope?.[k], `eligibility.scope.${k} is translated`);
  }
});

check("§6 — official findings are recorded verbatim, with production queries still NOT executed", () => {
  const doc = read("docs/OFFICIAL_SOURCE_READ_2026-11-06.md");
  for (const q of ["**90**", "**100**", "**5**", "**5.5**", "**7**", "**7.5**", "1–6 score scale", "Minimum: 90", "Recommended: 100"].slice(0, 6)) {
    assert.ok(doc.includes(q), `documented score ${q}`);
  }
  assert.match(doc, /Minimum \| Recommended \| Shkala/);
  assert.match(doc, /1\/21\/26/);
  for (const q of ["4.6%", "29,281", "1,334", "[780, 800]", "750 words", "1500 words", "C488", "approximately 120", "75%"]) {
    assert.ok(doc.includes(q), `verbatim/statistic ${q}`);
  }
  assert.match(doc, /read-only query[^.]*production DB[^.]*bajarilmadi/i);
  assert.match(doc, /Production.{0,80}migration.{0,40}llanmadi/i);
  const open = read("docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md");
  assert.match(open, /OFFICIAL_SOURCE_READ_2026-11-06\.md/);
  assert.match(open, /bajarilmagan \(aniq\)/i);
});

check("§5 — EN / UZ / RU all really render trust, unknown and recommended labels", () => {
  const cases: Array<[string, PresentedFact, RegExp, RegExp]> = [
    ["en", presentRaw({ value: 7, fieldLabel: "IELTS", trust: "observed", valueType: "observed_statistic" }), /observed/i, /not an official minimum/i],
    ["uz", presentRaw({ value: 7, fieldLabel: "IELTS", trust: "observed", valueType: "observed_statistic" }), /kuzatilgan|tarixiy|tasdiqlanmagan/i, /minimum/i],
    ["ru", presentRaw({ value: 7, fieldLabel: "IELTS", trust: "observed", valueType: "observed_statistic" }), /наблюд|историч|не подтвер/i, /минимум/i],
  ];
  for (const [locale, fact, trustRe, noteRe] of cases) {
    const html = renderHtml(fact, locale);
    assert.match(html, /data-testid="evidence-note"/, `${locale} renders the note`);
    assert.match(html, trustRe, `${locale} renders a translated trust label`);
    assert.match(html, noteRe, `${locale} renders the not-a-minimum caveat`);
    assert.doesNotMatch(html, /MISSING_MESSAGE|IntlError/, `${locale} has no missing key`);
  }
  for (const locale of ["en", "uz", "ru"]) {
    const unknown = renderHtml(presentRaw({
      value: null, fieldLabel: "Grant amount", trust: "legacy_unknown", valueType: "unverified",
    }), locale);
    assert.match(unknown, /data-evidence-display="unknown"/, `${locale} unknown state`);
    assert.doesNotMatch(unknown, />\s*0\s*</, `${locale} never turns unknown into zero`);
    const dict = (JSON.parse(read(`src/i18n/messages/${locale}.json`)) as { evidence: Record<string, string> }).evidence;
    // react-dom/server escapes apostrophes; compare both raw and escaped forms.
    const gap = dict.noSource || dict.noMetadata;
    const escaped = gap.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
    assert.ok(unknown.includes(gap) || unknown.includes(escaped)
      || unknown.includes(dict.noMetadata), `${locale} shows the translated, visible metadata gap`);
  }
});

check("RENDERED: missing evidence is not a publisher-confirmed absence or exemption",()=>{
  const base=officialFact("https://fictional.example.edu/policy");
  for(const [valueType,text] of [["not_published","Source confirms no published minimum"],["not_applicable","Source confirms this criterion does not apply"]] as const){
    const policy={...base,value:null,valueType,displayAs:"unknown" as const,isOfficialMinimum:false};
    assert.match(renderHtml(policy),new RegExp(text));
    const draft=renderHtml({...policy,trust:"unknown",verificationStatus:"review_needed"});
    assert.doesNotMatch(draft,/Source confirms/);assert.match(draft,/No confirmed value/);
  }
  const group=renderHtml({...base,value:'{"operator":"anyOf"}',displayAs:"unverified_value",isOfficialMinimum:false});
  assert.match(group,/Official criteria \(field-level verified\)/);assert.doesNotMatch(group,/Unverified value/);
});
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}
