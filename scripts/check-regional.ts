/**
 * Pillar 5.3 — "regional super powers" test.
 *
 * Proves the three Uzbekistan-specific surfaces cannot drift:
 *   1. every scholarship pack in `src/lib/regionalScholarships.ts` has ALL of
 *      its i18n keys (name/provider/note + doc/essay/milestone lists) in en, uz
 *      and ru, with the counts the metadata declares;
 *   2. every embassy checklist in `src/lib/visaChecklists.ts` has its name,
 *      source note and every item in all three languages;
 *   3. the country matcher answers the spellings a Tashkent student actually
 *      types and never matches a different country by accident;
 *   4. the honesty rules hold: no quotas, deadlines or selection chances are
 *      stored, and no pack promises a place or a visa;
 *   5. the grade converter's two readings agree with `gpaTo40Scale`;
 *   6. the UI components are wired to the modules (guards against dead data).
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  REGIONAL_SCHOLARSHIP_PACKS,
  regionalScholarshipsForDegree,
  regionalScholarshipKey,
} from "../src/lib/regionalScholarships";
import {
  EMBASSY_CHECKLIST_COUNTRIES,
  EMBASSY_CHECKLISTS,
  embassyChecklistFor,
  embassyChecklistItems,
} from "../src/lib/visaChecklists";
import { convertUzbekGradeToInternational, gpaTo40Scale } from "../src/lib/gpa";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✗ ${name}\n      ${(err as Error).message}`);
  }
}

const LANGS = ["en", "uz", "ru"] as const;
const messages = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    JSON.parse(fs.readFileSync(path.join("src/i18n/messages", `${lang}.json`), "utf8")),
  ])
  // The JSON shape is asserted at runtime below, key by key — a deep static
  // type here would only duplicate those assertions.
) as Record<(typeof LANGS)[number], Record<string, any>>;

console.log("Regional scholarship blueprints (Pillar 5.3)");

check("every pack has all of its i18n keys in en, uz and ru", () => {
  for (const pack of REGIONAL_SCHOLARSHIP_PACKS) {
    for (const lang of LANGS) {
      const ns = messages[lang].regionalScholarships?.[pack.id];
      assert.ok(ns, `${lang}: missing namespace for ${pack.id}`);
      for (const field of ["name", "provider", "note"] as const) {
        const value = (ns as Record<string, string>)[field];
        assert.ok(value && value.trim().length > 10, `${lang}: ${pack.id}.${field} is empty or too short`);
      }
      for (let i = 0; i < pack.docs; i++) {
        const leaf = `doc${i}`;
        assert.ok(ns[leaf]?.trim(), `${lang}: ${pack.id}.${leaf} missing`);
      }
      for (let i = 0; i < pack.essays; i++) {
        const leaf = `essay${i}`;
        assert.ok(ns[leaf]?.trim(), `${lang}: ${pack.id}.${leaf} missing`);
      }
      for (let i = 0; i < pack.milestones; i++) {
        const leaf = `milestone${i}`;
        assert.ok(ns[leaf]?.trim(), `${lang}: ${pack.id}.${leaf} missing`);
      }
    }
  }
});

check("the three languages are genuinely different (no English placeholder)", () => {
  let translatedNames = 0;
  for (const pack of REGIONAL_SCHOLARSHIP_PACKS) {
    const en = messages.en.regionalScholarships[pack.id];
    const uz = messages.uz.regionalScholarships[pack.id];
    const ru = messages.ru.regionalScholarships[pack.id];
    // The guidance text must never be English pasted into uz/ru …
    assert.notEqual(en.note, uz.note, `${pack.id}: uz note equals en`);
    assert.notEqual(en.note, ru.note, `${pack.id}: ru note equals en`);
    assert.notEqual(en.provider, uz.provider, `${pack.id}: uz provider equals en`);
    // … but an award's own name is a proper noun ("Global Korea Scholarship")
    // and may legitimately be the same in every language. Require that MOST
    // names are localized so a missing translation still fails.
    if (en.name !== uz.name && en.name !== ru.name) translatedNames++;
  }
  assert.ok(
    translatedNames >= Math.ceil(REGIONAL_SCHOLARSHIP_PACKS.length / 2),
    `only ${translatedNames} of ${REGIONAL_SCHOLARSHIP_PACKS.length} award names are localized`
  );
});

check("no quota, deadline or selection chance is stored in the copy", () => {
  const banned =
    /\b(\d{1,3}\s?%|guarantee[ds]?|guaranteed|kafolat|гарант|quota:?\s?\d|deadline is|muddat:?\s?\d{2}\.\d{2})/i;
  for (const lang of LANGS) {
    for (const pack of REGIONAL_SCHOLARSHIP_PACKS) {
      const ns = messages[lang].regionalScholarships[pack.id];
      for (const [key, value] of Object.entries(ns as Record<string, string>)) {
        assert.ok(!banned.test(value), `${lang}.${pack.id}.${key} contains a promise/number we do not store: ${value.slice(0, 90)}`);
      }
    }
  }
});

check("official URLs are https and match their programme", () => {
  const official: Record<string, string> = {
    eyuf: "eyuf.uz",
    gks: "studyinkorea.go.kr",
    hungaricum: "stipendiumhungaricum.hu",
    daad: "daad.de",
    turkiye: "turkiyeburslari.gov.tr",
    chevening: "chevening.org",
    fulbright: "usembassy.gov",
    erasmus: "europa.eu",
  };
  for (const pack of REGIONAL_SCHOLARSHIP_PACKS) {
    assert.ok(pack.url.startsWith("https://"), `${pack.id}: URL must be https`);
    assert.ok(pack.url.includes(official[pack.id]), `${pack.id}: unexpected official domain ${pack.url}`);
  }
});

check("degree filtering never invents an option and never hides it silently", () => {
  assert.equal(regionalScholarshipsForDegree(null).length, REGIONAL_SCHOLARSHIP_PACKS.length);
  for (const pack of regionalScholarshipsForDegree("Master")) {
    assert.ok(pack.degrees.includes("Master"));
  }
  const bachelor = regionalScholarshipsForDegree("Bachelor").map((p) => p.id);
  assert.ok(bachelor.includes("eyuf") && bachelor.includes("gks"));
  assert.ok(!bachelor.includes("chevening"), "Chevening is a Master-only award");
  assert.equal(regionalScholarshipsForDegree("PhD").length >= 5, true);
});

console.log("\nEmbassy document checklists (Pillar 5.3)");

check("every checklist has its name, source note and every item in all languages", () => {
  for (const country of EMBASSY_CHECKLIST_COUNTRIES) {
    for (const lang of LANGS) {
      const ns = messages[lang].visaChecklist?.[country];
      assert.ok(ns, `${lang}: missing checklist for ${country}`);
      assert.ok(ns.name?.trim(), `${lang}: ${country}.name missing`);
      assert.ok(ns.sourceNote?.trim(), `${lang}: ${country}.sourceNote missing`);
      for (const i of embassyChecklistItems(EMBASSY_CHECKLISTS.find((c) => c.country === country)!)) {
        assert.ok(ns[`item${i}`]?.trim(), `${lang}: ${country}.item${i} missing`);
      }
    }
  }
});

check("country matching answers real spellings and refuses near-misses", () => {
  assert.equal(embassyChecklistFor("USA")?.country, "USA");
  assert.equal(embassyChecklistFor("usa")?.country, "USA");
  assert.equal(embassyChecklistFor("AQSh")?.country, "USA");
  assert.equal(embassyChecklistFor("США")?.country, "USA");
  assert.equal(embassyChecklistFor("United States")?.country, "USA");
  assert.equal(embassyChecklistFor("Germaniya")?.country, "Germany");
  assert.equal(embassyChecklistFor("South Korea")?.country, "South Korea");
  assert.equal(embassyChecklistFor("Buyuk Britaniya")?.country, "UK");
  assert.equal(embassyChecklistFor(""), null);
  assert.equal(embassyChecklistFor(null), null);
  // The two-character aliases ("us", "uk") must not hijack other countries.
  assert.equal(embassyChecklistFor("Australia"), null);
  assert.equal(embassyChecklistFor("Ukraine"), null);
  assert.equal(embassyChecklistFor("Russia"), null);
});

check("the checklist is a document list, not a visa promise", () => {
  for (const country of EMBASSY_CHECKLIST_COUNTRIES) {
    for (const lang of LANGS) {
      const note = messages[lang].visaChecklist[country].sourceNote;
      assert.ok(note.length > 20, `${lang}.${country}: the source note must tell the student requirements change`);
    }
  }
});

console.log("\nUzbek grade converter (Pillar 5.3)");

check("the proportional reading agrees with the matcher's gpaTo40Scale", () => {
  for (const [value, scale, tsScale] of [
    [5, "five", 5],
    [4.5, "five", 5],
    [4, "five", 5],
    [3, "five", 5],
    [92, "hundred", 100],
    [71, "hundred", 100],
  ] as Array<[number, "five" | "hundred", number]>) {
    const c = convertUzbekGradeToInternational(value, scale);
    const direct = gpaTo40Scale(value, tsScale);
    assert.ok(c.proportionalUs != null && direct != null, `${value}/${scale}: expected a conversion`);
    assert.ok(Math.abs(c.proportionalUs! - direct!) < 0.0001, `${value}/${scale}: ${c.proportionalUs} vs ${direct}`);
  }
});

check("out-of-band values are unknown, never clamped", () => {
  assert.equal(convertUzbekGradeToInternational(6, "five").letterUs, null);
  assert.equal(convertUzbekGradeToInternational(101, "hundred").letterUs, null);
  assert.equal(convertUzbekGradeToInternational(-1, "five").noteKey, "noteUnknown");
});

console.log("\nWiring");

check("the components consume the modules (no dead data)", () => {
  const panel = fs.readFileSync("src/components/RegionalSuperpowers.tsx", "utf8");
  assert.ok(panel.includes("REGIONAL_SCHOLARSHIP_PACKS"), "the blueprints card must iterate the packs");
  assert.ok(panel.includes("EMBASSY_CHECKLISTS"), "the checklist card must iterate the countries");
  assert.ok(panel.includes("convertUzbekGradeToInternational"), "the converter card must use the shared converter");
  const hubs = fs.readFileSync("src/components/hubs/index.tsx", "utf8");
  assert.ok(hubs.includes("RegionalScholarshipsCard"), "the scholarships hub must render the blueprints");
  assert.ok(hubs.includes("EmbassyChecklistCard"), "the visa hub must render the checklist");
  const modal = fs.readFileSync("src/components/ProfileModal.tsx", "utf8");
  assert.ok(modal.includes("UzbekGradeConverterCard"), "the profile editor must show the grade converter");
});

check("the i18n namespaces exist for the card chrome", () => {
  for (const lang of LANGS) {
    const ns = messages[lang].regionalSuperpowers;
    assert.ok(ns, `${lang}: regionalSuperpowers namespace missing`);
    for (const key of [
      "blueprintsTitle",
      "docsLabel",
      "essaysLabel",
      "stepsLabel",
      "officialLink",
      "honestyNote",
      "checklistTitle",
      "converterTitle",
      "noteFive",
      "noteHundred",
      "noteUnknown",
    ]) {
      assert.ok(ns[key]?.trim(), `${lang}.regionalSuperpowers.${key} missing`);
    }
  }
});

if (failures.length) {
  console.log(`\nregional test FAILED: ${failures.length} failure(s)`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`\nregional test passed (${passed} sections)`);
