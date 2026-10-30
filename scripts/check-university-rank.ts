/**
 * Phase Y gate — one university page states one QS rank.
 *
 * The catalogue's ranks were corrected to the official QS 2026 edition on
 * 2026-10-23 (`docs/QS2026_RANK_VERIFICATION_2026-10-23.md`, 181 rows fixed,
 * 139 filled), but the stored descriptions and ranking chips were generated
 * from the pre-correction sequence — the one the same document debunked as "a
 * believable-looking sequence" (official table vs old column: 181 wrong, 16
 * right). Measured again today against the live catalogue, 356 active rows:
 *
 *   · 194 descriptions name a QS position, 194 ranking chips name one;
 *   · **178 of them disagree with `universities.world_ranking`**;
 *   · the gap reaches 601 places — University of Latvia reads "#200" in its
 *     prose and is 801 in QS 2026.
 *
 * Phase X made that prose readable in Uzbek and Russian, so the profile page
 * began printing two contradictory QS ranks in the reader's own language
 * ("QS jahon reytingida 200-o'rin" under a facts row saying "#801"). The fix
 * keeps the stored sentence and corrects only the figure, everywhere it is
 * printed: uz, ru **and** en, on the profile page and in the detail API.
 *
 * What must stay true, and is asserted below:
 *   1. the stated rank is the catalogue's verified one, never the stale one;
 *   2. a row without a verified rank keeps its prose untouched (no invention);
 *   3. a "#" that is not a QS position ("Top 10 in the UK #3") is left alone;
 *   4. the correction reaches the English page too — it is not a translation;
 *   5. the API and the page correct, so the two surfaces cannot disagree.
 *
 * Run: npm run test:university-rank
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  localizeHighlights,
  localizeHighlightItem,
  localizeUniversityDescription,
  universityDescriptionState,
} from "../src/lib/catalogLocalizer";
import { reconcileEmbeddedRank } from "../src/lib/universityProse";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

/* --------------------------------------------------------- live fixtures */

/** University of Latvia, id 200: prose #200, QS 2026 position 801. */
const LATVIA = {
  rank: 801,
  description:
    "University of Latvia is a premier global research university in Riga, Latvia (QS World Ranking #200), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.",
  highlights: [
    "QS World University Ranking #200 globally",
    "Located in Riga, Latvia (Founded 1919)",
    "Comprehensive undergraduate, master's, and doctoral research programs",
  ],
};

/** UPC BarcelonaTech, id 46: prose #46, QS 2026 position 392. */
const UPC = {
  rank: 392,
  description:
    "Universitat Politècnica de Catalunya (UPC BarcelonaTech) is a premier global research university in Barcelona, Spain (QS World Ranking #46), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.",
};

/** MIT, id 1: prose #1, QS 2026 position 1 — the two agree. */
const MIT = {
  rank: 1,
  description:
    "Massachusetts Institute of Technology (MIT) is a premier global research university in Cambridge, MA, United States (QS World Ranking #1), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.",
};

/** University of Macau, id 254: no QS position in the prose at all. */
const MACAU = {
  rank: 254,
  description:
    "University of Macau is a public university in Macau, Macau SAR. Annual tuition is about $11000 and estimated living costs are $11000 per year. Graduates can stay up to 1 year(s) on a post-study work visa.",
};
const MACAU_RANK = 2458;

/* ------------------------------------------------------------- the rule */

check("the stale figure is replaced by the verified one", () => {
  const out = reconcileEmbeddedRank(LATVIA.description, LATVIA.rank);
  assert.match(out, /QS World Ranking #801/);
  assert.doesNotMatch(out, /#200/);
});

check("an agreeing figure is left exactly as written", () => {
  assert.equal(reconcileEmbeddedRank(MIT.description, MIT.rank), MIT.description);
});

check("a row with no verified rank keeps its prose untouched", () => {
  assert.equal(reconcileEmbeddedRank(LATVIA.description, null), LATVIA.description);
  assert.equal(reconcileEmbeddedRank(LATVIA.description, undefined), LATVIA.description);
  assert.equal(reconcileEmbeddedRank(LATVIA.description, 0), LATVIA.description);
  assert.equal(reconcileEmbeddedRank(LATVIA.description, Number.NaN), LATVIA.description);
});

check("a non-QS position is never rewritten", () => {
  const other = "Top 10 in the UK #3 for Computer Science";
  assert.equal(reconcileEmbeddedRank(other, 801), other);
  const mixed = "Ranked #3 in the UK; QS World Ranking #46.";
  assert.equal(reconcileEmbeddedRank(mixed, 392), "Ranked #3 in the UK; QS World Ranking #392.");
});

check("an empty or non-string value is returned as given", () => {
  assert.equal(reconcileEmbeddedRank("", 801), "");
});

/* --------------------------------------------------- description, 3 locales */

check("every locale states the verified rank, never the stale one", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    const { text } = universityDescriptionState(LATVIA.description, locale, LATVIA.rank);
    assert.doesNotMatch(text, /#200\b/, `${locale}: the stale number survived`);
    assert.match(text, /801/, `${locale}: the verified number is missing`);
  }
});

check("the English page is corrected too — this is not a translation", () => {
  const state = universityDescriptionState(LATVIA.description, "en", LATVIA.rank);
  assert.equal(state.verbatim, false);
  assert.equal(state.text, localizeUniversityDescription(LATVIA.description, "en", LATVIA.rank));
  assert.match(state.text, /QS World Ranking #801/);
});

check("a second attested row is corrected as well", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    const { text } = universityDescriptionState(UPC.description, locale, UPC.rank);
    assert.doesNotMatch(text, /#46\b/, `${locale}: UPC still states #46`);
    assert.match(text, /392/, `${locale}: UPC does not state 392`);
  }
});

check("a correct row renders unchanged in every locale", () => {
  const en = universityDescriptionState(MIT.description, "en", MIT.rank).text;
  assert.equal(en, MIT.description);
  for (const locale of ["uz", "ru"] as const) {
    const { text } = universityDescriptionState(MIT.description, locale, MIT.rank);
    assert.match(text, /1-o'rin|1-е место/, `${locale}: MIT rank lost`);
  }
});

check("a description that states no QS position stays free of one", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    const { text } = universityDescriptionState(MACAU.description, locale, MACAU_RANK);
    assert.doesNotMatch(text, /2458/, `${locale}: a rank was invented`);
    assert.doesNotMatch(text, /QS/, `${locale}: a QS claim was invented`);
  }
});

check("the localized state and the localized description agree", () => {
  for (const locale of ["uz", "ru"] as const) {
    assert.equal(
      localizeUniversityDescription(LATVIA.description, locale, LATVIA.rank),
      universityDescriptionState(LATVIA.description, locale, LATVIA.rank).text
    );
  }
});

/* ---------------------------------------------------- ranking chips */

check("the ranking chip states the verified rank in every locale", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    const [chip] = localizeHighlights(LATVIA.highlights, locale, LATVIA.rank) as string[];
    assert.doesNotMatch(chip, /#200\b/, `${locale}: the chip kept the stale number`);
    assert.match(chip, /801/, `${locale}: the chip lost the verified number`);
  }
  assert.equal(
    localizeHighlightItem("QS World University Ranking #200 globally", "en", 801),
    "QS World University Ranking #801 globally"
  );
});

check("only the ranking chip changes; the others keep their wording", () => {
  const uz = localizeHighlights(LATVIA.highlights, "uz", LATVIA.rank) as string[];
  assert.equal(uz.length, LATVIA.highlights.length);
  assert.match(uz[1], /Joylashuvi: Riga, Latviya/);
  assert.match(uz[2], /Bakalavriat, magistratura va doktorantura/);
  // Without a rank the chips are untouched by the correction.
  assert.deepEqual(localizeHighlights(LATVIA.highlights, "en"), LATVIA.highlights);
});

check("an English chip that only had its number fixed is still English", () => {
  const chips = localizeHighlights(LATVIA.highlights, "en", LATVIA.rank) as string[];
  const sentenceChips = chips.filter((chip) => /Located in|Comprehensive/.test(chip));
  assert.equal(sentenceChips.length, 2, "the untranslated chip was translated by accident");
});

/* --------------------------------------------------------------- wiring */

const page = readFileSync(join(ROOT, "src/app/universities/[id]/page.tsx"), "utf8");
const route = readFileSync(join(ROOT, "src/app/api/universities/[id]/route.ts"), "utf8");

check("the profile page passes the verified rank into both localizers", () => {
  assert.match(
    page,
    /universityDescriptionState\(\s*u\.description,\s*locale,\s*u\.worldRanking\s*\)/,
    "the description is rendered without the verified rank"
  );
  assert.match(
    page,
    /localizeHighlights\(\s*u\.highlights,\s*locale,\s*u\.worldRanking\s*\)/,
    "the chips are rendered without the verified rank"
  );
});

check("the profile page compares chips against the corrected strings", () => {
  assert.match(page, /reconcileEmbeddedRank\(item, u\.worldRanking\)/);
});

check("the detail API corrects before it caches or localizes", () => {
  const correction = route.indexOf('localizeUniversityDescription(uni.description, "en", uni.worldRanking)');
  const cacheWrite = route.indexOf("setCachedUniversityDetailBase(uniId, basePayload)");
  const cacheRead = route.indexOf("getCachedUniversityDetailBase(uniId)");
  assert.ok(correction > 0, "the API does not correct the description");
  assert.ok(cacheWrite > correction, "the cache is written before the correction");
  assert.ok(cacheRead > correction, "the cache is read before the correction");
  assert.match(route, /localizeHighlights\(uni\.highlights, "en", uni\.worldRanking\)/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
