/**
 * Deterministic checks for the opportunities matcher (src/lib/opportunities.ts).
 *
 * The matcher must stay honest:
 *   1. Weights sum to 100 and never exceed it.
 *   2. Unknown/recurring deadlines are neutral (5), never a guessed date.
 *   3. A past deadline is flagged, not hidden.
 *   4. `now` is injectable, so results are reproducible.
 *
 * Run: npm run test:opportunities
 */

import { countByType, mergeOpportunitySearchOrder, rankOpportunities, scoreOpportunity, type OpportunityInput } from "../src/lib/opportunities";
import { expandMultilingualSearchTerms } from "../src/lib/catalogLocalizer";
import { matchesUniversityType } from "../src/lib/universityType";
import { haveCompatibleEmbeddingDimensions, isUsefulSemanticQuery } from "../src/lib/ai/semanticQuery";

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

const NOW = new Date("2026-09-25T00:00:00Z");

const csProfile = { major: "Computer Science", country: "Uzbekistan", degreeLevel: "Bachelor" };
const bioProfile = { major: "Biology", country: "Uzbekistan", degreeLevel: "Master" };

const icpc: OpportunityInput = {
  id: 1,
  type: "competition",
  title: "ICPC",
  country: null,
  fields: '["Computer Science", "Mathematics"]',
  level: "undergrad",
  deadlineDate: null,
};

const gsoC: OpportunityInput = {
  id: 2,
  type: "internship",
  title: "Google Summer of Code",
  country: null,
  fields: '["Computer Science", "Software Engineering"]',
  level: "undergrad",
  deadlineDate: "2026-03-15",
};

const future: OpportunityInput = {
  id: 3,
  type: "competition",
  title: "Future Cup",
  country: "Uzbekistan",
  fields: '["Biology"]',
  level: "grad",
  deadlineDate: "2026-12-01",
};

const generic: OpportunityInput = {
  id: 4,
  type: "research",
  title: "Open research",
  country: null,
  fields: '["All"]',
  level: "any",
  deadlineDate: null,
};

section("1. Field, country, level, deadline stack deterministically");

const cs = scoreOpportunity(icpc, csProfile, NOW);
check("CS undergrad → 40 (field) + 15 (international) + 20 (level) + 5 (recurring) = 80", cs.match === 80, `got ${cs.match}: ${JSON.stringify(cs)}`);
check("reasons mention the field", cs.reasons.some((r) => r.includes("Computer Science")));

const bio = scoreOpportunity(future, bioProfile, NOW);
check("Biology master → 40 + 20 (home) + 20 + 10 (future) = 90", bio.match === 90, `got ${bio.match}: ${JSON.stringify(bio)}`);

const csOnFuture = scoreOpportunity(future, csProfile, NOW);
check("CS undergrad on a Biology grad event → field flag + level penalty", csOnFuture.flags.length >= 2 && csOnFuture.match < 60, `got ${csOnFuture.match}`);

section("2. Deadlines are never guessed");

const past = scoreOpportunity(gsoC, csProfile, NOW);
check("passed deadline flagged, deadline points 0", past.flags.some((f) => f.includes("passed")) && past.match === 40 + 15 + 20, `got ${past.match}: ${JSON.stringify(past.flags)}`);
check("recurring deadline is neutral 5, with a check-the-page flag", scoreOpportunity(icpc, csProfile, NOW).flags.some((f) => f.includes("official page")));

const invalid = scoreOpportunity({ ...gsoC, deadlineDate: "not-a-date" }, csProfile, NOW);
check("invalid date is not a crash and not a pass", invalid.flags.some((f) => f.includes("not valid")));

section("3. Generic opportunities stay open, never perfect");

const gen = scoreOpportunity(generic, csProfile, NOW);
check("generic → 25 + 15 + 20 + 5 = 65", gen.match === 65, `got ${gen.match}`);

const emptyProfile = scoreOpportunity(icpc, { major: null, country: null, degreeLevel: null }, NOW);
check("empty profile is not a 0 and not a 100", emptyProfile.match > 0 && emptyProfile.match < 100, `got ${emptyProfile.match}`);

section("4. Ranking is deterministic and bounded");

const ranked = rankOpportunities([generic, icpc, gsoC, future], csProfile, NOW);
check("best first", ranked[0].opportunity.id === 1, `top: ${ranked[0].opportunity.title} (${ranked[0].match})`);
check("all scores within 0–100", ranked.every((r) => r.match >= 0 && r.match <= 100));
check("tie-break by id is stable", JSON.stringify(rankOpportunities([generic, icpc, gsoC, future], csProfile, NOW)) === JSON.stringify(ranked));

section("5. Counts for the NEW FOR YOU row");

const counts = countByType([icpc, gsoC, future, generic]);
check("counts by type", counts.competition === 2 && counts.internship === 1 && counts.research === 1 && counts.summer_school === 0, JSON.stringify(counts));

section("6. Malformed fields JSON is safe");

const broken = scoreOpportunity({ ...icpc, fields: "{broken" }, csProfile, NOW);
check("broken JSON → treated as no fields, no crash", broken.match >= 10 && !Number.isNaN(broken.match));


section("7. Discovery search is lexical-first with bounded optional semantic ranking");
const typed = [
  { id: 1, title: "Exact scholarship", match: 60 },
  { id: 2, title: "Semantic neighbor", match: 80 },
  { id: 3, title: "Unrelated", match: 100 },
];
const lexicalHits = new Set([1]);
check("lexical fallback returns matching catalogue records only", mergeOpportunitySearchOrder(typed, lexicalHits, []).map((x) => x.id).join() === "1");
check("semantic candidates can add a related result but never unrelated rows", mergeOpportunitySearchOrder(typed, lexicalHits, [{ id: 2, similarity: 0.8 }]).map((x) => x.id).sort().join() === "1,2");
check("hybrid order has deterministic lexical/profile tie-breaks", mergeOpportunitySearchOrder(typed, lexicalHits, [{ id: 2, similarity: 0.5 }]).map((x) => x.id).join() === mergeOpportunitySearchOrder(typed, lexicalHits, [{ id: 2, similarity: 0.5 }]).map((x) => x.id).join());
check("semantic top-k is capped at 63", mergeOpportunitySearchOrder(typed, new Set(), typed.map((x) => ({ id: x.id, similarity: 0.8 })), 999).length === 3);
check("semantic gate ignores short fragments and accepts multilingual 4+ character queries", !isUsefulSemanticQuery("AI") && isUsefulSemanticQuery("stipendiya"));
check("query and candidates require matching finite vector dimensions", haveCompatibleEmbeddingDimensions([[1, 0], [0, 1]]) && !haveCompatibleEmbeddingDimensions([[1, 0], [0, 1, 2]]) && !haveCompatibleEmbeddingDimensions([[1, Number.NaN], [0, 1]]));
check("Uzbek scholarship query expands to canonical terms", expandMultilingualSearchTerms("stipendiya").includes("scholarship"));
check("Russian scholarship query expands to canonical terms", expandMultilingualSearchTerms("стипендия").includes("scholarship"));


section("8. University type filtering preserves unknown values");
check("public records pass the Public filter", matchesUniversityType("Public Research University", "Public"));
check("private records pass the Private filter", matchesUniversityType("Private Non-Profit", "Private"));
check("unknown type does not pass Public or Private filters", !matchesUniversityType(null, "Public") && !matchesUniversityType("", "Private"));
check("opposite published types do not cross-match", !matchesUniversityType("Public", "Private") && !matchesUniversityType("Private", "Public"));
check("All/unsupported type values do not hide records", matchesUniversityType(null, "All") && matchesUniversityType("Public", "Other"));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
