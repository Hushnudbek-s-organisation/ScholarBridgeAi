/**
 * Deterministic checks for mentor marketplace matching (Phase 4).
 *
 * A mentor is worth talking to because they walked the same path. The matching
 * must be precise about WHY each one was suggested — a student who cannot see
 * the reason will not trust the introduction — and verification must never be
 * quietly optional.
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
  country: "Germany",
  targetUniversities: ["TU Munich"],
  targetMajor: "Computer Science",
  degreeLevel: "Bachelor",
  targetScholarships: ["DAAD"],
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
  languages: '["Portuguese"]',
  ratingAverage: null,
  ratingCount: 0,
});

// ---------------------------------------------------------------------------
section("1. The closest path ranks first");

const result = matchMentors(request, [unrelated, sameCountryOnly, exact]);
check("all three are returned", result.matches.length === 3);
check(
  "the exact-path mentor is first",
  result.matches[0].mentor.displayName === "Dilnoza",
  result.matches.map((m) => m.mentor.displayName).join(" > ")
);
check(
  "the unrelated mentor is last",
  result.matches[result.matches.length - 1].mentor.displayName === "Ana"
);
check("the exact match scores much higher", result.matches[0].score > result.matches[2].score + 40);

section("2. Every match explains itself");

const top = result.matches[0];
check("reasons are never empty", top.reasons.length > 0);
check("the shared university is named", top.reasons.some((r) => /TU Munich|Technical University of Munich/i.test(r)));
check("the shared scholarship is named", top.reasons.some((r) => /DAAD/.test(r)));
check("the same country is named", top.reasons.some((r) => /Germany/.test(r)));
check("the same field is named", top.reasons.some((r) => /Same field of study/.test(r)));
check("verification is stated", top.reasons.some((r) => /verified/i.test(r)));
check("a mentor with enough reviews shows the rating", top.reasons.some((r) => /Rated 4.8\/5 from 12 sessions/.test(r)));

const ana = result.matches.find((m) => m.mentor.id === unrelated.id)!;
check("a weak match still has a reason", ana.reasons.length > 0);
check("its mismatches are listed as gaps", ana.gaps.length >= 3);
check("a different university is named as a gap", ana.gaps.some((g) => /Different university/.test(g)));
check("a missing language is named as a gap", ana.gaps.some((g) => /preferred language/.test(g)));

section("3. Name matching tolerates abbreviations");

check(
  "TU Munich matches Technical University of Munich",
  matchMentors({ targetUniversities: ["TU Munich"] }, [exact]).matches.length === 1
);
check(
  "a completely different university does not score the university bonus",
  matchMentors({ targetUniversities: ["Harvard"] }, [exact]).matches[0].reasons.every(
    (r) => !/target universities/i.test(r)
  )
);

section("4. Verification is never silently optional");

const unverified = mentor({ id: 4, displayName: "Unverified", isVerified: false });
const verifiedWeak = mentor({ id: 5, displayName: "Verified Weak", country: "France", university: "Sorbonne" });
const ordering = matchMentors({ country: "Germany", targetUniversities: ["TU Munich"] }, [
  unverified,
  verifiedWeak,
]);
check(
  "a verified mentor outranks a better-matching unverified one",
  ordering.matches[0].mentor.displayName === "Verified Weak",
  ordering.matches.map((m) => `${m.mentor.displayName}:${m.verified}`).join(" > ")
);
check("an unverified mentor is labelled", ordering.matches.find((m) => m.mentor.id === 4)!.verified === false);
check(
  "an unverified mentor says so in its gaps",
  ordering.matches.find((m) => m.mentor.id === 4)!.gaps.some((g) => /Not verified/i.test(g))
);
const allUnverified = matchMentors(
  { country: "Germany", targetUniversities: ["TU Munich"] },
  [mentor({ id: 11, displayName: "Unverified A", isVerified: false }),
   mentor({ id: 12, displayName: "Unverified B", isVerified: false, university: "LMU Munich" })]
);
check(
  "the note warns when nothing is verified",
  /None of these mentors are verified/i.test(allUnverified.note),
  allUnverified.note
);

section("5. Price filtering");

const pricey = mentor({ id: 6, displayName: "Pricey", hourlyRateUsd: 150 });
const free = mentor({ id: 7, displayName: "Free", freeSessions: true, hourlyRateUsd: 0 });
const unknownRate = mentor({ id: 8, displayName: "Unknown rate", hourlyRateUsd: null });

const budgeted = matchMentors({ ...request, maxHourlyRateUsd: 30 }, [pricey, free, unknownRate]);
check("a mentor over the ceiling is filtered out", !budgeted.matches.some((m) => m.mentor.id === 6));
check("the filtered count is reported", budgeted.filtered.overBudget === 1);
check("a free mentor survives", budgeted.matches.some((m) => m.mentor.id === 7));
check(
  "an unknown rate is not treated as over budget",
  budgeted.matches.some((m) => m.mentor.id === 8),
  budgeted.matches.map((m) => m.mentor.displayName).join(",")
);
check("the note explains what was hidden", /hidden because their rate/.test(budgeted.note));
check("price labels are set", budgeted.matches.find((m) => m.mentor.id === 7)!.price === "free");
check("a null rate reads as unknown, not free", budgeted.matches.find((m) => m.mentor.id === 8)!.price === "unknown");

section("6. Inactive mentors never appear");

const inactive = matchMentors(request, [mentor({ id: 9, displayName: "Gone", isActive: false }), exact]);
check("an inactive mentor is excluded", !inactive.matches.some((m) => m.mentor.id === 9));
check("the exclusion is counted", inactive.filtered.inactive === 1);

section("7. Empty states");

const none = matchMentors(request, []);
check("no mentors returns no matches", none.matches.length === 0);
check("and explains how the marketplace grows", /sign up/i.test(none.note));

const irrelevant = matchMentors({ country: "Germany", targetUniversities: ["TU Munich"] }, [unrelated]);
check(
  "a mentor who matched nothing is dropped rather than padded",
  irrelevant.matches.every((m) => m.score >= 10)
);

section("8. Parsing and determinism");

check("a JSON expertise column parses", matchMentors(request, [exact]).matches[0].reasons.length > 0);
const listMentor = mentor({ id: 10, displayName: "List", languages: ["Uzbek", "English"], expertise: ["visa"] });
check(
  "a plain array also parses",
  matchMentors({ preferredLanguages: ["uzbek"] }, [listMentor]).matches.some((m) =>
    m.reasons.some((r) => /Speaks your language/i.test(r))
  )
);

const a = matchMentors(request, [exact, sameCountryOnly, unrelated]);
const b = matchMentors(request, [unrelated, sameCountryOnly, exact]);
check(
  "input order does not change the ranking",
  JSON.stringify(a.matches.map((m) => m.mentor.id)) === JSON.stringify(b.matches.map((m) => m.mentor.id))
);

check("the result is limited", matchMentors(request, Array.from({ length: 20 }, (_, i) => mentor({ id: i + 100, displayName: `M${i}` })), { limit: 5 }).matches.length === 5);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
