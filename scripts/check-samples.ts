/**
 * Gold-standard sample library + profile extractor — deterministic tests.
 *
 * Covers Phase 7 (the exemplar library every authoring surface can load) and
 * Pillar 5.2 (the 10-second CV/transcript auto-fill):
 *   - registry integrity: unique ids, all three languages everywhere, text and
 *     annotated blocks present, block text actually occurring in the sample
 *   - the HONESTY rule: a number the model invents is stripped, a number that
 *     appears verbatim survives
 *   - the deterministic regex pass on the flagship sample CV, including the
 *     fields a student would expect (IELTS, SAT, GRE, GPA + scale, degree)
 *
 * Run:  npm run test:samples
 */

import assert from "node:assert/strict";
import {
  SAMPLES,
  SAMPLE_BY_ID,
  SAMPLE_DEFAULTS,
  SAMPLE_ONBOARDING_CV_IELTS,
  SAMPLE_SOP_MASTERS_AI,
  SAMPLE_SOP_MASTERS_AI_FIELDS,
  SAMPLE_STRUCTURE_NOTE,
  SAMPLE_VISA_QA_GOLD,
  SAMPLE_VISA_QA_USA_F1,
  isSampleId,
  sampleById,
  sampleTextFor,
  samplesByKind,
} from "../src/lib/samples/exemplars";
import {
  convertUzbekGradeToInternational,
} from "../src/lib/gpa";
import {
  detectedFieldKeys,
  extractDeterministicProfileFacts,
  verifyExtractedNumbersInSource,
} from "../src/lib/profileExtractor";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}
const section = (t: string) => console.log(`\n${t}`);

console.log("\nSample library — registry integrity");

check("every advertised sample is registered exactly once", () => {
  assert.ok(SAMPLES.length >= 19, `only ${SAMPLES.length} samples`);
  const ids = SAMPLES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate sample id");
  for (const id of ids) assert.equal(SAMPLE_BY_ID[id]?.id, id, `missing map entry for ${id}`);
});

check("every sample has three languages, text and annotated blocks", () => {
  for (const sample of SAMPLES) {
    for (const lang of ["en", "uz", "ru"] as const) {
      assert.ok(sample.title[lang].length > 3, `${sample.id}: title.${lang}`);
      assert.ok(sample.summary[lang].length > 10, `${sample.id}: summary.${lang}`);
    }
    assert.ok(sample.text.trim().length > 200, `${sample.id}: text too short`);
    assert.ok(sample.blocks.length >= 2, `${sample.id}: needs annotated blocks`);
    for (const block of sample.blocks) {
      for (const lang of ["en", "uz", "ru"] as const) {
        assert.ok(block.heading[lang].length > 2, `${sample.id}: heading.${lang}`);
        assert.ok(block.why[lang].length > 30, `${sample.id}: why.${lang}`);
      }
      assert.ok(sample.text.includes(block.text.slice(0, 60)), `${sample.id}: block text not part of the sample`);
    }
  }
});

check("the ids the UI wiring map references all exist", () => {
  const required = [
    "SAMPLE_ONBOARDING_CV_IELTS",
    "SAMPLE_SOP_MASTERS_AI",
    "SAMPLE_ACADEMIC_CV_STEM",
    "SAMPLE_EUROPASS_CV_POLICY",
    "SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING",
    "SAMPLE_WHY_US_ESSAY",
    "SAMPLE_PERSONAL_STATEMENT",
    "SAMPLE_SOP_BACHELORS_CS",
    "SAMPLE_LOR_REQUEST_EMAIL",
    "SAMPLE_LOR_PROFESSOR_ACADEMIC",
    "SAMPLE_LOR_EMPLOYER_RESEARCH",
    "SAMPLE_PROFESSOR_COLD_EMAIL",
    "SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI",
    "SAMPLE_VAULT_SHORT_ANSWERS",
    "SAMPLE_PORTFOLIO_ACTIVITIES",
    "SAMPLE_VISA_QA_USA_F1",
    "SAMPLE_VISA_QA_GERMANY",
    "SAMPLE_VISA_QA_KOREA_D2",
    "SAMPLE_VISA_QA_UK",
  ];
  for (const id of required) assert.ok(isSampleId(id), `missing ${id}`);
  assert.ok(SAMPLE_VISA_QA_GOLD === SAMPLE_VISA_QA_USA_F1, "gold visa track aliases the USA F-1 set");
});

check("SOP field pre-fill matches the SOP sample", () => {
  assert.match(SAMPLE_SOP_MASTERS_AI_FIELDS.targetUni, /Technical University of Munich/);
  assert.match(SAMPLE_SOP_MASTERS_AI.text, /91\.4% accuracy/);
  assert.match(SAMPLE_SOP_MASTERS_AI.text, /MIRMI/);
});

check("the integrity banner exists in all three languages and is not a placeholder", () => {
  for (const lang of ["en", "uz", "ru"] as const) {
    assert.ok(SAMPLE_STRUCTURE_NOTE[lang].length > 80, `banner.${lang}`);
  }
  assert.match(SAMPLE_STRUCTURE_NOTE.en, /replace/i);
  assert.match(SAMPLE_STRUCTURE_NOTE.ru, /замените/i);
  assert.match(SAMPLE_STRUCTURE_NOTE.uz, /qayta yozing/i);
  assert.equal(new Set(Object.values(SAMPLE_STRUCTURE_NOTE)).size, 3, "banner is translated, not copied");
});

check("lookup helpers fail closed for unknown or hostile ids", () => {
  assert.equal(sampleById(null), null);
  assert.equal(sampleById("../../etc/passwd"), null);
  assert.equal(sampleTextFor("nope"), "");
  assert.equal(isSampleId("sop"), false);
  assert.ok(samplesByKind("visa").length >= 4, "four visa tracks expected");
  for (const [k, id] of Object.entries(SAMPLE_DEFAULTS)) {
    assert.ok(isSampleId(id), `SAMPLE_DEFAULTS.${k} → unknown id ${id}`);
  }
});

console.log("\nProfile extractor — deterministic pass (Pillar 5.2)");

check("the flagship CV sample yields the fields a student would expect", () => {
  const facts = extractDeterministicProfileFacts(SAMPLE_ONBOARDING_CV_IELTS.text);
  assert.equal(facts.ieltsScore, 7.5, `ielts=${facts.ieltsScore}`);
  assert.equal(facts.satScore, 1510, `sat=${facts.satScore}`);
  assert.equal(facts.greScore, 326, `gre=${facts.greScore}`);
  assert.equal(facts.gpa, 4.88, `gpa=${facts.gpa}`);
  assert.equal(facts.gpaScale, 5, `scale=${facts.gpaScale}`);
  assert.equal(facts.email, "azizbek.karimov@example.uz");
  assert.equal(facts.degreeLevel, "Bachelor", `degree=${facts.degreeLevel}`);
  assert.equal(facts.researchPublications, 2, `pubs=${facts.researchPublications}`);
  assert.ok(facts.leadership.length > 0, "leadership section parsed");
  assert.ok(facts.awards.length > 0, "awards section parsed");
  assert.ok(facts.fullName?.includes("AZIZBEK"), `name=${facts.fullName}`);
});

check("sub-score lists do not hijack the overall IELTS band", () => {
  const facts = extractDeterministicProfileFacts(
    "IELTS Academic: Overall 7.5 (Listening 8.5, Reading 8.0, Writing 7.0, Speaking 7.0)"
  );
  assert.equal(facts.ieltsScore, 7.5);
});

check("out-of-range guesses are ignored, not clamped", () => {
  const tooHigh = extractDeterministicProfileFacts("IELTS 12.5. TOEFL 300. SAT 200.");
  assert.equal(tooHigh.ieltsScore, null);
  assert.equal(tooHigh.toeflScore, null);
  assert.equal(tooHigh.satScore, null);
  const toefl = extractDeterministicProfileFacts("TOEFL iBT: 100 (R 26, L 27, S 23, W 24)");
  assert.equal(toefl.toeflScore, 100);
});

check("empty or junk text produces empty facts, never defaults", () => {
  for (const input of ["", "   ", "hello world"]) {
    const facts = extractDeterministicProfileFacts(input);
    assert.equal(facts.gpa, null);
    assert.equal(facts.ieltsScore, null);
    assert.equal(facts.satScore, null);
    assert.equal(facts.degreeLevel, null);
    assert.equal(facts.budgetAnnualUsd, null);
    assert.deepEqual(facts.leadership, []);
  }
});

check("a pasted 100-point GPA is only reported when a scale is present", () => {
  assert.equal(extractDeterministicProfileFacts("GPA: 85 / 100").gpaScale, 100);
  assert.equal(extractDeterministicProfileFacts("Cumulative GPA 4.88/5.0").gpaScale, 5);
  const noScale = extractDeterministicProfileFacts("GPA 3.75, no scale given");
  assert.equal(noScale.gpa, null, "a GPA without a scale is not assumed to be /4.0");
});

console.log("\nProfile extractor — honesty rule for AI output");

check("a number that is not in the source text is stripped", () => {
  const source = SAMPLE_ONBOARDING_CV_IELTS.text;
  const { facts, stripped } = verifyExtractedNumbersInSource(source, {
    gpa: 3.75, // invented (the CV states 4.88 and a 3.90 US equivalent)
    duolingoScore: 135, // invented
    ieltsScore: 7.5, // in the text
    satScore: 1590, // invented
    researchPublications: 2, // in the text
  });
  assert.equal(facts.gpa, null);
  assert.equal(facts.satScore, null);
  assert.equal(facts.ieltsScore, 7.5);
  assert.equal(facts.researchPublications, 2);
  assert.equal(facts.duolingoScore, null);
  assert.deepEqual(stripped.sort(), ["duolingoScore", "gpa", "satScore"]);
});

check("decimal variants survive; unrelated numbers do not", () => {
  const { facts } = verifyExtractedNumbersInSource("GPA 4.88 / 5.0 scale", { gpa: 4.88, gpaScale: 5, budgetAnnualUsd: 25000 });
  assert.equal(facts.gpa, 4.88);
  assert.equal(facts.gpaScale, 5);
  assert.equal(facts.budgetAnnualUsd, null);
});

check("detected field order is stable and skips empty values", () => {
  const facts = extractDeterministicProfileFacts(SAMPLE_ONBOARDING_CV_IELTS.text);
  const keys = detectedFieldKeys(facts);
  assert.equal(keys[0], "fullName");
  assert.ok(keys.includes("ieltsScore") && keys.includes("gpaScale"));
  assert.ok(!keys.includes("gmatScore"), "GMAT is not in the sample");
  assert.deepEqual(keys, [...keys]);
});

console.log("\nUzbekistan / Central Asia grade converter (Pillar 5.3)");

check("5-point scale: both readings, the letter mapping and ECTS", () => {
  const five = convertUzbekGradeToInternational(5, "five");
  assert.equal(five.proportionalUs, 4);
  assert.equal(five.letterUs, 4);
  assert.equal(five.letter, "A");
  assert.equal(five.ects, "ECTS A");
  const four = convertUzbekGradeToInternational(4.5, "five");
  assert.equal(four.letter, "A", "4.5 and above is the A band");
  const mid = convertUzbekGradeToInternational(4, "five");
  assert.equal(mid.letter, "B");
  assert.equal(mid.letterUs, 3);
  assert.equal(mid.proportionalUs, 3.2);
  assert.equal(convertUzbekGradeToInternational(3, "five").letter, "C");
  assert.equal(convertUzbekGradeToInternational(2, "five").letter, "F");
});

check("100-point rating system bands 86–100 / 71–85 / 55–70", () => {
  assert.equal(convertUzbekGradeToInternational(92, "hundred").letter, "A");
  assert.equal(convertUzbekGradeToInternational(86, "hundred").letter, "A");
  assert.equal(convertUzbekGradeToInternational(85, "hundred").letter, "B");
  assert.equal(convertUzbekGradeToInternational(71, "hundred").letter, "B");
  assert.equal(convertUzbekGradeToInternational(70, "hundred").letter, "C");
  assert.equal(convertUzbekGradeToInternational(55, "hundred").letter, "C");
  assert.equal(convertUzbekGradeToInternational(54, "hundred").letter, "F");
  assert.equal(convertUzbekGradeToInternational(85, "hundred").proportionalUs, 3.4);
});

check("out-of-band values stay unknown — never clamped", () => {
  for (const bad of [0, -3, 6, 120, null] as const) {
    const c = convertUzbekGradeToInternational(bad as number, "five");
    assert.equal(c.letter, null);
    assert.equal(c.letterUs, null);
    assert.equal(c.proportionalUs, null);
    assert.equal(c.noteKey, "noteUnknown");
  }
  assert.equal(convertUzbekGradeToInternational(6, "five").noteKey, "noteUnknown", "a 100-point score in the 5-point field is not clamped");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
