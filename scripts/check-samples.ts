/**
 * Integrity checks for the gold-standard samples library and its wiring.
 *
 *   1. library shape — ids, group sizes, one structural role per paragraph
 *   2. the brief's text — verbatim, with the two documented typo fixes
 *   3. honest voice — no AI clichés, fictional contact details, placeholders
 *      instead of a stranger's personal data
 *   4. every sample fits the form it loads into (maxLength, categories)
 *   5. i18n — every track, role, group and field label in en/uz/ru
 *   6. smart auto-fill — exact extractions and the traps it must refuse
 *   7. honesty guards and wiring in the ten surfaces; lazy loading kept
 *
 * Rubric scores are asserted by test:essays and test:visa.
 *
 * Run: npm run test:samples
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { analyzeEssay } from "../src/lib/essay";
import {
  ACTIVITY_PORTFOLIO_SAMPLES,
  ANSWER_VAULT_SAMPLES,
  LOR_SAMPLES,
  OFFICIAL_DOCUMENT_TEMPLATES,
  SAMPLE_GROUPS,
  SAMPLE_LIBRARY,
  SAMPLE_ROLES,
  SOP_SAMPLES,
  allSamples,
  findSample,
  type SampleExemplar,
} from "../src/lib/samples/exemplars";
import { isUnmodifiedSample, placeholderCount, segmentSampleText, splitParagraphs } from "../src/lib/samples/text";
import { extractProfileFields, toProfileFields, type ExtractedKey } from "../src/lib/profileExtract";

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

const read = (path: string) => readFileSync(path, "utf8");
const samples = allSamples();

// ---------------------------------------------------------------------------
section("1. Library shape");

const expectedSizes: Record<string, number> = {
  onboardingCv: 3,
  sop: 3,
  essay: 10,
  lor: 4,
  cvBuilder: 3,
  answerVault: 6,
  activity: 4,
  document: 3,
  visa: 4,
};
for (const group of SAMPLE_GROUPS) {
  check(`${group}: ${expectedSizes[group]} samples`, SAMPLE_LIBRARY[group].length === expectedSizes[group], `got ${SAMPLE_LIBRARY[group].length}`);
}
const ids = samples.map((sample) => sample.id);
check("ids are unique across the library", new Set(ids).size === ids.length);
check("ids are camelCase i18n keys (no dots)", ids.every((id) => /^[a-z][A-Za-z0-9]+$/.test(id)));
check("findSample resolves every id", ids.every((id) => findSample(id)?.id === id));
for (const sample of samples) {
  const paragraphs = splitParagraphs(sample.text);
  check(
    `${sample.id}: ${paragraphs.length} paragraphs ↔ ${sample.roles.length} structural roles`,
    paragraphs.length === sample.roles.length && sample.roles.every((role) => (SAMPLE_ROLES as readonly string[]).includes(role))
  );
}
for (const doc of OFFICIAL_DOCUMENT_TEMPLATES.filter((d) => d.textUz)) {
  check(`${doc.id}: Uzbek version keeps the English paragraph structure`, splitParagraphs(doc.textUz!).length === doc.roles.length);
}
check("no sample text carries stray whitespace or CRLF", samples.every((s) => !/\r|[ \t]+\n|\n{3,}/.test(s.text) && s.text === s.text.trim()));
const origins = samples.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.origin]: (acc[s.origin] ?? 0) + 1 }), {});
console.log(`    origins: ${JSON.stringify(origins)}`);

// ---------------------------------------------------------------------------
section("2. The brief's text is verbatim, with two documented corrections");

const kaist = SOP_SAMPLES.find((s) => s.id === "sopKaist")!;
const teacher = LOR_SAMPLES.find((s) => s.kind === "teacher")!;
const everyText = samples.map((s) => `${s.text}\n${"fields" in s ? JSON.stringify(s.fields) : ""}`).join("\n");
check("“ratusan” (Indonesian) → “hundreds of” in the KAIST hook", kaist.fields.personalHook.includes("hundreds of small merchants") && !/ratusan/i.test(everyText));
check("“DilshodbekNazarov” → “Dilshodbek Nazarov” in the lyceum letter", teacher.text.includes("Dilshodbek Nazarov") && !everyText.includes("DilshodbekNazarov"));
check(
  "brief anchors are present word for word",
  everyText.includes("predicted root-zone moisture deficits 48 hours in advance with 91.4% accuracy") &&
    everyText.includes("female-led workshops maintained a 98.4% repayment rate") &&
    everyText.includes("reminded me of my grandfather's workbench") &&
    everyText.includes("all 38 technicians adopted it voluntarily within a month")
);

// ---------------------------------------------------------------------------
section("3. Honest, human voice");

const BANNED = /ever since i was a child|\bpassionate\b|\bdelve\b|\btapestry\b|\btestament\b/i;
check("no sample uses the clichés the brief bans (passionate, delve, tapestry, testament…)", samples.every((s) => !BANNED.test(s.text)), samples.filter((s) => BANNED.test(s.text)).map((s) => s.id).join(", "));
check(
  "no sample trips the essay engine's cliché list",
  samples.every((s) => analyzeEssay(s.text, { type: "supplemental" }).cliches.length === 0),
  samples.filter((s) => analyzeEssay(s.text, { type: "supplemental" }).cliches.length > 0).map((s) => s.id).join(", ")
);
const authoredEmails = samples
  .filter((s) => s.origin === "authored")
  .flatMap((s) => s.text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []);
check("authored samples use reserved example.com addresses only", authoredEmails.length > 0 && authoredEmails.every((email) => email.endsWith("@example.com")), authoredEmails.join(", "));
for (const doc of OFFICIAL_DOCUMENT_TEMPLATES) {
  check(`${doc.id}: personal details are [placeholders] (${placeholderCount(doc.text)} in the template)`, placeholderCount(doc.text) >= 5);
}
check("templates contain no passport-like numbers", OFFICIAL_DOCUMENT_TEMPLATES.every((d) => !/\b[A-Z]{2}\d{7}\b/.test(`${d.text}${d.textUz ?? ""}`)));
check("the affidavit ships an Uzbek (Homiylik xati) version", Boolean(OFFICIAL_DOCUMENT_TEMPLATES.find((d) => d.kind === "affidavit")?.textUz?.startsWith("HOMIYLIK XATI")));
check(
  "highlighting splits evidence and placeholders without losing text",
  samples.every((s) => segmentSampleText(s.text).map((seg) => seg.value).join("") === s.text)
);

// ---------------------------------------------------------------------------
section("4. Every sample fits the form it loads into");

const recLimits = { university: 160, deadline: 80, relationshipContext: 240, requestedFocus: 300, supportingExample: 500 } as const;
for (const lor of LOR_SAMPLES) {
  const fields = lor.recLetterFields;
  check(
    `${lor.id}: recommendation-brief fields fit their inputs`,
    (Object.keys(recLimits) as (keyof typeof recLimits)[]).every((key) => fields[key].length > 0 && fields[key].length <= recLimits[key])
  );
}
const activityRoute = read("src/app/api/activities/route.ts");
const categories = [...(activityRoute.match(/ACTIVITY_CATEGORIES = \[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
for (const { id, activity } of ACTIVITY_PORTFOLIO_SAMPLES) {
  check(
    `${id}: “${activity.category}” is an API category and every field fits its column`,
    categories.includes(activity.category) &&
      activity.title.length <= 200 &&
      activity.role.length <= 120 &&
      activity.organization.length <= 160 &&
      activity.description.length <= 4000 &&
      activity.achievements.length <= 4000 &&
      activity.hours > 0
  );
}
check(
  "the SOP drafter receives all six inputs for every track",
  SOP_SAMPLES.every((s) => Object.values(s.fields).every((value) => value.trim().length > 20))
);
check(
  "the Answer Vault has one example for each of its six categories",
  ["general", "motivation", "leadership", "career", "challenge", "community"].every((c) => ANSWER_VAULT_SAMPLES.filter((s) => s.category === c).length === 1)
);

// ---------------------------------------------------------------------------
section("5. Every label exists in en, uz and ru");

const ALL_EXTRACTED: ExtractedKey[] = [
  "gpa", "gpaScale", "ieltsScore", "toeflScore", "satScore", "greScore", "actScore", "duolingoScore",
  "graduationYear", "workExperienceYears", "researchPublications", "degreeLevel",
];
for (const locale of ["en", "uz", "ru"]) {
  const s = JSON.parse(read(`src/i18n/messages/${locale}.json`)).samples ?? {};
  const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  check(`${locale}: a track label for every sample`, ids.every((id) => nonEmpty(s.tracks?.[id])), ids.filter((id) => !nonEmpty(s.tracks?.[id])).join(", "));
  check(`${locale}: no stale track label`, Object.keys(s.tracks ?? {}).every((id) => ids.includes(id)));
  check(`${locale}: label + “why” for all ${SAMPLE_ROLES.length} structural roles`, SAMPLE_ROLES.every((role) => nonEmpty(s.roles?.[role]?.label) && nonEmpty(s.roles?.[role]?.why)));
  check(`${locale}: a title for every sample group`, SAMPLE_GROUPS.every((group) => nonEmpty(s.groups?.[group])));
  check(`${locale}: a name for every auto-fill field`, ALL_EXTRACTED.every((key) => nonEmpty(s.fields?.[key])));
  check(
    `${locale}: visa grounds and evidence labels`,
    ["purposeOfStudy", "funding", "homeTies", "nonImmigrantIntent", "specificity", "languageClarity"].every((k) => nonEmpty(s.visaGrounds?.[k])) &&
      ["purpose", "funding", "home_ties", "specific_detail"].every((k) => nonEmpty(s.visaEvidence?.[k]))
  );
}

// ---------------------------------------------------------------------------
section("6. Smart auto-fill reads only what the text states");

const extracted = (text: string) => Object.fromEntries(extractProfileFields(text).map((f) => [f.key, f.value]));
const stem = extracted(findSample("onboardingStem")!.text);
const bachelor = extracted(findSample("onboardingBachelor")!.text);
const econ = extracted(findSample("onboardingEconomics")!.text);
check("STEM snapshot → GPA 4.88/5, IELTS 7.5, SAT 1510, graduation 2027, 2 papers, Master", JSON.stringify(stem) === JSON.stringify({ gpa: 4.88, gpaScale: 5, ieltsScore: 7.5, satScore: 1510, graduationYear: 2027, researchPublications: 2, degreeLevel: "Master" }), JSON.stringify(stem));
check("Lyceum snapshot → GPA 5/5, IELTS 7.5, SAT 1510, graduated 2026, Bachelor", JSON.stringify(bachelor) === JSON.stringify({ gpa: 5, gpaScale: 5, ieltsScore: 7.5, satScore: 1510, graduationYear: 2026, degreeLevel: "Bachelor" }), JSON.stringify(bachelor));
check("Economics snapshot → GPA 3.92/4, IELTS 8, GRE 327, 2.5 years' work, 2 publications, Master", JSON.stringify(econ) === JSON.stringify({ gpa: 3.92, gpaScale: 4, ieltsScore: 8, greScore: 327, graduationYear: 2023, workExperienceYears: 2.5, researchPublications: 2, degreeLevel: "Master" }), JSON.stringify(econ));
check("every detection quotes the text it came from", extractProfileFields(findSample("onboardingEconomics")!.text).every((f) => f.excerpt.length > 0 && findSample("onboardingEconomics")!.text.replace(/\s+/g, " ").includes(f.excerpt)));
check("a section score is never promoted to a total (SAT Math 790, GRE Quant 167)", extractProfileFields("SAT Math score of 790/800. GRE Quantitative 167.").length === 0);
check("the English word “act” is not an ACT score", extractProfileFields("the act of 33 people").length === 0);
check("out-of-range values are refused (IELTS 9.5, GPA on a 7-point scale, TOEFL 150)", extractProfileFields("IELTS 9.5 · GPA 6.1 / 7 · TOEFL 150").length === 0);
check("other phrasings are read (4.95/5.00 GPA, TOEFL iBT 105, 3 years of work experience)", JSON.stringify(extracted("4.95/5.00 GPA, TOEFL iBT 105, 3 years of work experience")) === JSON.stringify({ gpa: 4.95, gpaScale: 5, toeflScore: 105, workExperienceYears: 3 }));
check("empty text yields nothing", extractProfileFields("   ").length === 0);
check("toProfileFields builds the object hosts apply", JSON.stringify(toProfileFields(extractProfileFields("IELTS 7.0"))) === JSON.stringify({ ieltsScore: 7 }));

// ---------------------------------------------------------------------------
section("7. Honesty guards, wiring and lazy loading");

check("isUnmodifiedSample ignores whitespace differences", isUnmodifiedSample("A  b\nc", "A b c"));
check("isUnmodifiedSample is false once a word changes, or for empty values", !isUnmodifiedSample("A b d", "A b c") && !isUnmodifiedSample("", "A") && !isUnmodifiedSample("A", undefined));

const surfaces: [string, string, RegExp[]][] = [
  ["1 Onboarding", "src/components/OnboardingWizard.tsx", [/<SmartAutofillBox supported=\{AUTOFILL_FIELDS\} onApply=\{applyAutofill\}/]],
  ["1 Profile editor", "src/components/ProfileModal.tsx", [/<SmartAutofillBox supported=\{AUTOFILL_FIELDS\} onApply=\{applyAutofill\}/]],
  ["2 CV builder", "src/components/PlanningStudio.tsx", [/group="cvBuilder"/, /setCompareCv\(sample\)/]],
  ["3 SOP studio", "src/components/AiSopStudio.tsx", [/group="sop" onLoad=\{loadSopSample\}/, /drafterHoldsSample/]],
  ["4 Essay rubric", "src/components/EssayRubricStudio.tsx", [/group="essay"/, /void scoreDraft\(draft\)/, /textHoldsSample/]],
  ["5 Rec-letter helper", "src/components/RecLetterPanel.tsx", [/group="lor"/, /onLoad=\{loadLorSample\}/]],
  ["6 Rec manager", "src/components/journey/AfterAdmissionPanels.tsx", [/group="lor"/, /lorDrawerTitle/]],
  ["7 Answer Vault", "src/components/growth/AnswerVault.tsx", [/ANSWER_VAULT_SAMPLES/, /isUnmodifiedSample\(answer, loadedExample\[promptId\]\)/]],
  ["8 Activities", "src/components/journey/PreparePanels.tsx", [/group="activity"/, /formHoldsSample/]],
  ["9 Document vault", "src/components/journey/PreparePanels.tsx", [/<DocumentTemplatesCard \/>/]],
  ["9 Funding", "src/components/hubs/index.tsx", [/<DocumentTemplatesCard kinds=\{\["affidavit", "coverNote"\]\}/]],
  ["10 Visa center", "src/components/journey/ExplorePanels.tsx", [/<VisaModelAnswers countryHint=\{country\} \/>/]],
  ["10 Speaking assistant", "src/components/VisaSpeakingAssistant.tsx", [/<VisaModelAnswers\s+countryHint=\{country\.code\}\s+onlyHinted/]],
];
for (const [label, file, patterns] of surfaces) {
  const src = read(file);
  check(`${label}: wired in ${file}`, patterns.every((re) => re.test(src)), patterns.filter((re) => !re.test(src)).map(String).join(" "));
}
check("the auto-fill box refuses to apply an unchanged sample CV", /disabled=\{holdsSample \|\| applicable\.length === 0\}/.test(read("src/components/samples/SmartAutofillBox.tsx")));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|mts)$/.test(entry) ? [path] : [];
  });
}
const staticLibraryImports = walk("src")
  .filter((path) => !path.endsWith(join("samples", "exemplars.ts")))
  .flatMap((path) =>
    [...read(path).matchAll(/^import\s+(?!type\b)[^;]*from\s+["'](?:@\/lib\/samples\/exemplars|\.\.?\/[^"']*samples\/exemplars)["']/gm)].map(() => path)
  );
check("no app module statically imports the library (type-only imports keep it a lazy chunk)", staticLibraryImports.length === 0, staticLibraryImports.join(", "));
check("the library has no runtime imports besides its ./text helpers", [...read("src/lib/samples/exemplars.ts").matchAll(/^(?:import|export)\s+(?!type\b)[^;]*from\s+["']([^"']+)["']/gm)].every((m) => m[1] === "./text"));

const roleCount = new Set(samples.flatMap((s: SampleExemplar) => s.roles)).size;
console.log(`\n  ${samples.length} samples · ${roleCount} of ${SAMPLE_ROLES.length} roles in use · ${SAMPLE_GROUPS.length} surfaces`);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
