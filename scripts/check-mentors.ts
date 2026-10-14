/**
 * Deterministic checks for mentor marketplace matching.
 *
 * Run: npm run test:mentors
 */

import { matchMentors, type Mentor, type MentorRequest } from "../src/lib/mentors";

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

const mentor = (over: Partial<Mentor> & { id: number; displayName: string }): Mentor => ({
  country: "Germany",
  university: "Technical University of Munich",
  program: "Computer Science",
  degreeLevel: "Bachelor",
  scholarshipName: null,
  expertise: '["applications"]',
  languages: '["English", "German"]',
  hourlyRateUsd: 20,
  freeSessions: false,
  isVerified: true,
  isActive: true,
  ratingAverage: 4.8,
  ratingCount: 12,
  ...over,
});

const request: MentorRequest = {
  targetCountries: ["Germany"],
  targetUniversities: ["TU Munich"],
  targetMajor: "Computer Science",
  degreeLevel: "Bachelor",
  targetScholarships: ["DAAD"],
  needsFinancialAid: true,
  preferredLanguages: ["English"],
};

const exact = mentor({ id: 1, displayName: "Dilnoza", scholarshipName: "DAAD Scholarship" });
const sameCountryOnly = mentor({
  id: 2,
  displayName: "Bobur",
  university: "LMU Munich",
  program: "Physics",
  scholarshipName: null,
});
const unrelated = mentor({
  id: 3,
  displayName: "Ana",
  country: "Brazil",
  university: "USP",
  program: "Law",
  scholarshipName: "DAAD Scholarship",
  languages: '["Portuguese"]',
  ratingAverage: null,
  ratingCount: 0,
});

section("1. The closest profile overlap ranks first");

const result = matchMentors(request, [unrelated, sameCountryOnly, exact]);
check("profiles with sufficient shared data are returned", result.matches.length === 3);
check(
  "the exact-path mentor is first",
  result.matches[0].mentor.displayName === "Dilnoza",
  result.matches.map((m) => m.mentor.displayName).join(" > ")
);
check(
  "the profile with one shared scholarship but other mismatches is last",
  result.matches[result.matches.length - 1].mentor.displayName === "Ana"
);
check("the exact match scores much higher", result.matches[0].score > result.matches[2].score + 40);
check("the overlap score is not displayed as an outcome probability", result.matches[0].score <= 100);

section("2. Every result has localized message descriptors and truthful reasons");

const top = result.matches[0];
check("reasons are never empty", top.reasonMessages.length > 0);
check("every displayed reason has a translation key", top.reasonMessages.every((m) => typeof m.key === "string"));
check("the shared university is named as profile data", top.reasons.some((r) => /Profile lists Technical University of Munich/.test(r)));
check("the shared scholarship is described as reported experience", top.reasons.some((r) => /reports experience with DAAD/.test(r)));
check("the matching preferred study country is named", top.reasons.some((r) => /preferred study countries/.test(r)));
check("the same field is described as profile data", top.reasons.some((r) => /Profile lists Computer Science as its field/.test(r)));
check("verification is described as a profile flag", top.reasons.some((r) => /Profile marked as verified/.test(r)));
check("ratings are described as listed profile data", top.reasons.some((r) => /Profile lists an average of 4.8\/5 across 12 sessions/.test(r)));

const ana = result.matches.find((m) => m.mentor.id === unrelated.id)!;
check("its mismatches are paired with localized keys", ana.gapMessages.length >= 3 && ana.gapMessages.every((m) => !!m.key));
check("a different university is named as a gap", ana.gaps.some((g) => /different university/i.test(g)));
check("a different preferred country is named as a gap", ana.gaps.some((g) => /not one of your preferred study countries/.test(g)));
check("a missing communication language is named as a gap", ana.gaps.some((g) => /No selected communication language/.test(g)));

section("3. Unknown targets are not treated as mismatches");

const countryOnly = matchMentors({ targetCountries: ["Germany"] }, [exact]).matches[0];
check("no saved university does not create a false university mismatch", !countryOnly.gapMessages.some((m) => m.key === "gaps.differentUniversity"));
check("no stated field is treated as unknown, not a different field", countryOnly.gapMessages.some((m) => m.key === "gaps.programListed"));
const legacyCountry = matchMentors({ country: "Germany" }, [exact]).matches[0];
check("the explicit legacy target-country field remains supported", legacyCountry.reasonMessages.some((m) => m.key === "reasons.sameCountry"));
const noCountryPreference = matchMentors({ targetUniversities: ["TU Munich"] }, [exact]).matches[0];
check("mentor location is not compared to a missing student target country", !noCountryPreference.reasonMessages.some((m) => m.key === "reasons.sameCountry") && !noCountryPreference.gapMessages.some((m) => m.key === "gaps.differentCountry"));
check(
  "an unrelated university does not receive the university match bonus",
  matchMentors({ targetUniversities: ["Harvard"] }, [exact]).matches.every((m) => m.reasonMessages.every((r) => r.key !== "reasons.sameUniversity"))
);

section("4. Verification is separate from the overlap score and remains visible");

const unverified = mentor({ id: 4, displayName: "Unverified", isVerified: false });
const verifiedWeak = mentor({ id: 5, displayName: "Verified Weak", country: "France", university: "Sorbonne" });
const ordering = matchMentors(request, [unverified, verifiedWeak]);
check(
  "a verified profile sorts ahead of a stronger unverified overlap",
  ordering.matches[0].mentor.displayName === "Verified Weak",
  ordering.matches.map((m) => `${m.mentor.displayName}:${m.verified}:${m.score}`).join(" > ")
);
const verifiedScore = matchMentors({ targetUniversities: ["TU Munich"] }, [exact]).matches[0].score;
const unverifiedScore = matchMentors({ targetUniversities: ["TU Munich"] }, [unverified]).matches[0].score;
check("verification does not inflate profile overlap", verifiedScore === unverifiedScore);
check("an unverified profile explains that it is not marked verified", ordering.matches.find((m) => m.mentor.id === 4)!.gapMessages.some((g) => g.key === "gaps.notVerified"));
const allUnverified = matchMentors(
  { targetCountries: ["Germany"], targetUniversities: ["TU Munich"] },
  [mentor({ id: 11, displayName: "Unverified A", isVerified: false }), mentor({ id: 12, displayName: "Unverified B", isVerified: false, university: "LMU Munich" })]
);
check("the note warns when no result is marked verified", allUnverified.noteMessage.key === "notes.noneVerified");

section("5. Price filtering includes a zero-dollar ceiling");

const pricey = mentor({ id: 6, displayName: "Pricey", hourlyRateUsd: 150 });
const free = mentor({ id: 7, displayName: "Free", freeSessions: true, hourlyRateUsd: 0 });
const unknownRate = mentor({ id: 8, displayName: "Unknown rate", hourlyRateUsd: null });
const budgeted = matchMentors({ ...request, maxHourlyRateUsd: 30 }, [pricey, free, unknownRate]);
check("a mentor over the ceiling is filtered out", !budgeted.matches.some((m) => m.mentor.id === 6));
check("the filtered count is reported", budgeted.filtered.overBudget === 1);
check("a free mentor survives", budgeted.matches.some((m) => m.mentor.id === 7));
check("an unknown rate is not treated as over budget", budgeted.matches.some((m) => m.mentor.id === 8));
check("the note explains what was hidden", budgeted.noteMessage.key === "notes.overBudget");
check("free is distinct from an unknown rate", budgeted.matches.find((m) => m.mentor.id === 7)!.price === "free" && budgeted.matches.find((m) => m.mentor.id === 8)!.price === "unknown");
const zeroCeiling = matchMentors({ ...request, maxHourlyRateUsd: 0 }, [pricey, free, unknownRate]);
check("a zero-dollar ceiling filters known paid rates", !zeroCeiling.matches.some((m) => m.mentor.id === 6) && zeroCeiling.filtered.overBudget === 1);
check("a zero-dollar ceiling retains free and unknown-rate profiles", zeroCeiling.matches.some((m) => m.mentor.id === 7) && zeroCeiling.matches.some((m) => m.mentor.id === 8));
const invalidCeiling = matchMentors({ ...request, maxHourlyRateUsd: Number.NaN }, [pricey]);
check("an invalid rate ceiling does not corrupt matching", invalidCeiling.matches.some((m) => m.mentor.id === 6));

section("6. Inactive mentors never appear");

const inactive = matchMentors(request, [mentor({ id: 9, displayName: "Gone", isActive: false }), exact]);
check("an inactive mentor is excluded", !inactive.matches.some((m) => m.mentor.id === 9));
check("the exclusion is counted", inactive.filtered.inactive === 1);

section("7. Empty results are not padded");

const none = matchMentors(request, []);
check("no mentors returns no matches", none.matches.length === 0);
check("the no-result note describes filters rather than unsupported signup promises", none.noteMessage.key === "notes.noMatches");
const irrelevant = matchMentors({ targetCountries: ["Germany"], targetUniversities: ["TU Munich"] }, [unrelated]);
check("a profile without enough overlap is dropped", irrelevant.matches.length === 0);

section("8. Parsing and determinism");

check("JSON expertise and language columns do not break matching", matchMentors(request, [exact]).matches[0].reasonMessages.length > 0);
const listMentor = mentor({ id: 10, displayName: "List", languages: ["Uzbek", "English"], expertise: ["visa"] });
check(
  "plain arrays parse and only explicit communication preferences match",
  matchMentors({ targetCountries: ["Germany"], preferredLanguages: ["uzbek"] }, [listMentor]).matches.some((m) =>
    m.reasonMessages.some((r) => r.key === "reasons.languages")
  )
);
const a = matchMentors(request, [exact, sameCountryOnly, unrelated]);
const b = matchMentors(request, [unrelated, sameCountryOnly, exact]);
check("input order does not change ranking", JSON.stringify(a.matches.map((m) => m.mentor.id)) === JSON.stringify(b.matches.map((m) => m.mentor.id)));
check("the result is limited", matchMentors(request, Array.from({ length: 20 }, (_, i) => mentor({ id: i + 100, displayName: `M${i}` })), { limit: 5 }).matches.length === 5);

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
