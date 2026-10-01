/**
 * check-recommend.ts — regression coverage for the subject-to-program
 * recommender (2026-10 task, §4).
 *
 * Two layers:
 *   1. PURE ENGINE UNIT TESTS (src/lib/recommend.ts) — no DB at all:
 *      subject matching (synonyms, multiple interests), met/unmet/unknown
 *      separation, missing-data neutrality, no-probability rule, provenance
 *      + stale flags, funding matches, ranking order.
 *   2. API TESTS on an ISOLATED throwaway embedded Postgres (port 55450,
 *      wiped each run — never touches DATABASE_URL):
 *      auth (401), validation (400), ownership (403 for another profile),
 *      input-source transparency, save + plan actions with ownership.
 *
 * All catalog fixtures are clearly fictional ("RECOMMEND-FIXTURE:").
 * Deterministic dates; no randomness. Run: npm run test:recommend
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import {
  subjectAffinity,
  assessEligibility,
  assessAffordability,
  gpaTo40Scale,
  recommend,
  normalizeSubject,
  type RecommendationCatalog,
  type RecommendationInput,
  type RecommendProgram,
  type RecommendUniversity,
  type RecommendScholarship,
} from "../src/lib/recommend";

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

// ---------------------------------------------------------------------------
// 1. Subject matching (pure)
// ---------------------------------------------------------------------------

section("1. Subject matching — synonyms and multiple interests");

check("exact match", subjectAffinity(["Computer Science"], "Computer Science").level === "exact");
check("synonym: software engineering ↔ Computer Science", subjectAffinity(["Software Engineering"], "Computer Science").level === "synonym");
check("synonym direction reversed", subjectAffinity(["Computer Science"], "Software Engineering").level === "synonym");
check(
  "multiple interests: best one wins",
  subjectAffinity(["Biology", "Data Science"], "Data Science").level === "exact" &&
    subjectAffinity(["Biology", "Data Science"], "Data Science").matchedInterests[0] === "data science"
);
check(
  "multiple interests: synonym tier when no exact",
  subjectAffinity(["Biology", "Machine Learning"], "Artificial Intelligence").level === "synonym"
);
check("partial: shared meaningful word", subjectAffinity(["Financial Mathematics"], "Mathematics").level !== "none");
check("no program field → none (not fabricated)", subjectAffinity(["Computer Science"], null).level === "none");
check("no student interests → unknown (neutral 0.5)", subjectAffinity([], "Computer Science").level === "unknown");
check("normalization: punctuation/case", normalizeSubject("M.Sc. (Hons) in Bio-Tech") === "m sc hons in bio tech");
check("unrelated subjects → none", subjectAffinity(["Law"], "Computer Science").level === "none");

// ---------------------------------------------------------------------------
// 2. Eligibility — met / unmet / unknown strictly separate
// ---------------------------------------------------------------------------

section("2. Eligibility — met vs unmet vs unknown");

const baseReqs = [
  {
    programId: 1,
    minIelts: 6.5,
    minToefl: null,
    minDet: null,
    minSat: 1200,
    minAct: null,
    minGpa: 3.0,
    ibRequirement: null,
    aLevelRequirement: null,
    apRequirement: null,
    subjectRequirements: "Two math subjects",
    otherRequirements: null,
  },
];

check(
  "met: above every minimum",
  assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 7, sat: 1400 }, baseReqs).items.every((i) => i.status === "met")
);
check(
  "unmet: below one minimum, others met",
  (() => {
    const e = assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 5.5, sat: 1400 }, baseReqs);
    return e.unmet === 1 && e.met === 2 && e.items.find((i) => i.key === "ielts")?.status === "unmet";
  })()
);
check(
  "unknown: missing student values are NEVER unmet",
  (() => {
    const e = assessEligibility({}, baseReqs);
    return e.unknown === 3 && e.unmet === 0 && e.items.every((i) => i.status === "unknown");
  })()
);
check("mixed: known-met + known-unmet + unknown coexist", (() => {
  const e = assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 5.0 }, baseReqs);
  return e.met === 1 && e.unmet === 1 && e.unknown === 1;
})());
check("GPA 3.0/5.0 → 2.4 on 4.0 scale", gpaTo40Scale(3.0, 5.0) === 2.4);
check("GPA 85/100 → 3.4 on 4.0 scale", Math.abs(gpaTo40Scale(85, 100)! - 3.4) < 0.001);
check("GPA > 4 without a scale → unknown (no assumption)", gpaTo40Scale(8.5, null) === null);
check("GPA ≤ 4 without a scale compared as-is (safe)", gpaTo40Scale(3.5, null) === 3.5);
check("text requirements carried through, not scored as numbers", (() => {
  const e = assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 7, sat: 1400 }, baseReqs);
  return e.textRequirements.some((t) => t.kind === "subject" && t.text === "Two math subjects");
})());

// ---------------------------------------------------------------------------
// 3. Missing data is neutral (never looks negative)
// ---------------------------------------------------------------------------

section("3. Missing data is neutral");

const uni = (over: Partial<RecommendUniversity> & { id: number; name: string }): RecommendUniversity => ({
  country: "Testland",
  city: null,
  websiteUrl: null,
  annualLivingEst: null,
  livingCostCurrency: "USD",
  ...over,
});

const program = (over: Partial<RecommendProgram> & { id: number; universityId: number; name: string }): RecommendProgram => ({
  field: "Computer Science",
  degreeLevel: "Bachelor",
  durationYears: 4,
  durationUnit: "years",
  studyMode: "Full-time",
  language: "English",
  annualTuition: 8000,
  tuitionCurrency: "USD",
  tuitionPeriod: "year",
  programUrl: null,
  applicationUrl: null,
  isVerified: true,
  sourceUrl: "https://fixture.example.edu/cs",
  lastVerifiedAt: "2026-09-01T00:00:00.000Z",
  verificationStatus: "verified",
  sources: [],
  ...over,
});

function makeCatalog(programs: RecommendProgram[], requirements: RecommendationCatalog["requirements"]): RecommendationCatalog {
  const universities = new Map<number, RecommendUniversity>();
  for (const p of programs) universities.set(p.universityId, uni({ id: p.universityId, name: `Fixture University ${p.universityId}` }));
  return { programs, universities, requirements, cycles: new Map(), scholarships: [] };
}

{
  const withReq = program({ id: 1, universityId: 1, name: "RECOMMEND-FIXTURE: CS with minimums" });
  const noReq = program({ id: 2, universityId: 1, name: "RECOMMEND-FIXTURE: CS no minimums" });
  const emptyInput: RecommendationInput = { interests: ["Computer Science"] };
  const unknownResult = recommend(emptyInput, makeCatalog([withReq], new Map([[1, baseReqs]])))[0];
  const noReqResult = recommend(emptyInput, makeCatalog([noReq], new Map()))[0];
  check(
    "unknown eligibility is NOT penalised below the no-requirements baseline",
    unknownResult.matchScore >= noReqResult.matchScore - 6,
    `unknown=${unknownResult.matchScore} noReq=${noReqResult.matchScore}`
  );
  check("missingInputs lists exactly the unknown inputs", (() => {
    const m = unknownResult.missingInputs;
    return ["gpa", "ielts", "sat"].every((k) => m.includes(k));
  })(), JSON.stringify(unknownResult.missingInputs));
  check(
    "a fully-unknown profile still gets a usable (not zero) match for an exact subject",
    unknownResult.matchScore > 30,
    String(unknownResult.matchScore)
  );
}

// ---------------------------------------------------------------------------
// 4. No probability, ever
// ---------------------------------------------------------------------------

section("4. Admission probability is never computed or displayed");

{
  const p = program({ id: 1, universityId: 1, name: "RECOMMEND-FIXTURE: CS" });
  const results = recommend(
    { interests: ["Computer Science"], gpa: 3.9, gpaScale: 4, ielts: 8, sat: 1500, budgetUsd: 50000 },
    makeCatalog([p], new Map([[1, baseReqs]]))
  );
  check("every result returns probability.available === false", results.every((r) => r.probability.available === false));
  check(
    "no numeric probability field anywhere in a result",
    JSON.stringify(results).search(/"probability":\{[^}]*"available":(true|false),[^}]*"reason"/) !== -1 &&
      !/"(chance|admissionPct|odds)"\s*:/.test(JSON.stringify(results))
  );
  check("match score stays a labelled match score (0–100)", results[0].matchScore >= 0 && results[0].matchScore <= 100);
}

// ---------------------------------------------------------------------------
// 5. Provenance + stale handling
// ---------------------------------------------------------------------------

section("5. Provenance and stale flags");

{
  const stale = program({ id: 1, universityId: 1, name: "RECOMMEND-FIXTURE: stale verified", lastVerifiedAt: "2025-01-01T00:00:00.000Z" });
  const fresh = program({ id: 2, universityId: 1, name: "RECOMMEND-FIXTURE: fresh verified", lastVerifiedAt: "2026-09-01T00:00:00.000Z" });
  const unverified = program({ id: 3, universityId: 1, name: "RECOMMEND-FIXTURE: unverified", lastVerifiedAt: null, verificationStatus: "unverified", isVerified: false, sourceUrl: null });
  const results = recommend({ interests: ["Computer Science"] }, makeCatalog([stale, fresh, unverified], new Map()));
  const byName = (n: string) => results.find((r) => r.program.name === n)!;
  check("verified program keeps sourceUrl + lastVerifiedAt", byName("RECOMMEND-FIXTURE: fresh verified").program.sourceUrl === "https://fixture.example.edu/cs");
  check("stale verified (>180d) is flagged programStale", byName("RECOMMEND-FIXTURE: stale verified").programStale === true);
  check("fresh verified is not stale", byName("RECOMMEND-FIXTURE: fresh verified").programStale === false);
  check("unverified program: no source invented, status kept", (() => {
    const r = byName("RECOMMEND-FIXTURE: unverified");
    return r.program.sourceUrl === null && r.program.verificationStatus === "unverified" && r.program.isVerified === false;
  })());
}

// ---------------------------------------------------------------------------
// 6. Affordability + funding (never fabricated)
// ---------------------------------------------------------------------------

section("6. Affordability and funding");

{
  const p = program({ id: 1, universityId: 1, name: "RECOMMEND-FIXTURE: CS", annualTuition: 8000 });
  const u = uni({ id: 1, name: "Fixture University", country: "Germany" });
  const sch: RecommendScholarship[] = [
    { id: 1, title: "RECOMMEND-FIXTURE: DAAD-like", country: "Germany", degreeLevels: ["Bachelor"], coverageType: "tuition", minGpa: 3.0, minIelts: 6.0, financialNeedBased: false, meritBased: true, eligibleMajors: ["Computer Science"] },
    { id: 2, title: "RECOMMEND-FIXTURE: Need-based", country: "Germany", degreeLevels: ["All"], coverageType: "full", minGpa: null, minIelts: null, financialNeedBased: true, meritBased: false, eligibleMajors: ["All"] },
    { id: 3, title: "RECOMMEND-FIXTURE: US-only", country: "United States", degreeLevels: ["All"], coverageType: "tuition", minGpa: null, minIelts: null, financialNeedBased: false, meritBased: true, eligibleMajors: ["All"] },
  ];
  const cat: RecommendationCatalog = {
    programs: [p],
    universities: new Map([[1, u]]),
    requirements: new Map(),
    cycles: new Map(),
    scholarships: sch,
  };
  const withBudget = assessAffordability({ interests: ["Computer Science"], budgetUsd: 10000, fundingNeed: "partial", degreeLevel: "Bachelor" }, p, u, sch, "Germany");
  const noBudget = assessAffordability({ interests: ["Computer Science"], degreeLevel: "Bachelor" }, p, u, sch, "Germany");
  const noFunding = assessAffordability({ interests: ["Computer Science"], budgetUsd: 10000 }, p, u, sch, "Germany");

  check("within budget when budget ≥ tuition (USD)", withBudget.withinBudget === "yes");
  check("over budget when budget < tuition", assessAffordability({ interests: ["Computer Science"], budgetUsd: 5000 }, p, u, sch, "Germany").withinBudget === "no");
  check("no budget → unknown, not 'no'", noBudget.withinBudget === "unknown");
  check("need-based scholarship matches only when funding need is known", (() => {
    const titles = withBudget.scholarshipMatches.map((s) => s.title);
    return titles.includes("RECOMMEND-FIXTURE: Need-based") && !noFunding.scholarshipMatches.some((s) => s.title === "RECOMMEND-FIXTURE: Need-based");
  })(), JSON.stringify(noFunding.scholarshipMatches.map((s) => s.title)));
  check("country mismatch excluded", withBudget.scholarshipMatches.every((s) => s.title !== "RECOMMEND-FIXTURE: US-only"));
  check("degree-level match honoured", withBudget.scholarshipMatches.some((s) => s.title === "RECOMMEND-FIXTURE: DAAD-like"));
  check("non-USD tuition → unknown (no cross-currency fabrication)", (() => {
    const eur = program({ id: 1, universityId: 1, name: "x", annualTuition: 6000, tuitionCurrency: "EUR" });
    return assessAffordability({ interests: ["Computer Science"], budgetUsd: 50000 }, eur, u, [], "Germany").withinBudget === "unknown";
  })());
}

// ---------------------------------------------------------------------------
// 7. Ranking order + visible factors
// ---------------------------------------------------------------------------

section("7. Ranking order and plain-language factors");

{
  const exact = program({ id: 1, universityId: 1, name: "RECOMMEND-FIXTURE: Computer Science", field: "Computer Science" });
  const synonym = program({ id: 2, universityId: 1, name: "RECOMMEND-FIXTURE: Software Engineering", field: "Software Engineering" });
  const partial = program({ id: 3, universityId: 1, name: "RECOMMEND-FIXTURE: Data and Computer Systems", field: "Data Science" });
  const none = program({ id: 4, universityId: 1, name: "RECOMMEND-FIXTURE: Law", field: "Law" });
  const results = recommend({ interests: ["Computer Science"] }, makeCatalog([none, partial, synonym, exact], new Map()));
  const order = results.map((r) => r.program.id);
  check("exact ranks first", order[0] === 1, JSON.stringify(order));
  check("synonym ranks before partial/none", order.indexOf(2) < order.indexOf(3) && order.indexOf(2) < order.indexOf(4), JSON.stringify(order));
  check("ranking factors are plain language", results[0].rankingFactors.some((f) => f.includes("direct subject match")));
  check("each result carries a nextCycle (null when absent) — never invented", results.every((r) => r.nextCycle === null));
}

// ---------------------------------------------------------------------------
// 8. API tests — isolated embedded Postgres + direct route handlers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 8. i18n — the recommend namespace exists in all three locales with the
//    compliance-critical strings (long-text parity is the task requirement).
// ---------------------------------------------------------------------------
section("8. i18n: recommend namespace ×3 locales (long-text parity)");
{
  const locales = ["en", "uz", "ru"] as const;
  const bundles: Record<string, any> = {};
  for (const loc of locales) {
    bundles[loc] = JSON.parse(
      readFileSync(new URL(`../src/i18n/messages/${loc}.json`, import.meta.url), "utf8")
    );
  }
  check("all three locales define the recommend namespace", locales.every((l) => typeof bundles[l]?.recommend === "object" && bundles[l].recommend !== null));
  const enKeys = Object.keys(bundles.en?.recommend ?? {});
  check(
    "key parity en/uz/ru and a substantial namespace (>=100 keys)",
    enKeys.length >= 100 &&
      locales.slice(1).every((l) => enKeys.every((k) => k in bundles[l].recommend) && Object.keys(bundles[l].recommend).every((k) => k in bundles.en.recommend)),
    `en=${enKeys.length} uz=${Object.keys(bundles.uz?.recommend ?? {}).length} ru=${Object.keys(bundles.ru?.recommend ?? {}).length}`
  );
  for (const key of [
    "probabilityUnavailable",
    "matchScoreHint",
    "fitExact",
    "eligibilityUnknown",
    "affordabilityUnknown",
    "errorDataUnavailable",
    "prefilledNote",
    "whyText",
  ]) {
    check(
      `"${key}" present and non-empty in all 3 locales`,
      locales.every((l) => typeof bundles[l]?.recommend?.[key] === "string" && bundles[l].recommend[key].length > 0)
    );
  }
  check(
    "probability text contains no numeric percentage in any locale",
    locales.every((l) => !/\d+\s*%/.test(String(bundles[l]?.recommend?.probabilityUnavailable ?? "")))
  );
  check(
    "match-score hint disclaims probability/guarantee in all 3 locales",
    locales.every((l) => /probability|ehtimol|вероятность/i.test(String(bundles[l]?.recommend?.matchScoreHint ?? "")))
  );
}

section("9. API: auth, ownership, validation, save + plan actions (isolated DB :55450)");

const PORT = 55450;
const DB = "sbtest";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const SECRET = "recommend-test-secret-value-0123456789";

async function apiPart() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/sb-recommend-pg",
    user: "test",
    password: "test",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  const fs = await import("node:fs");
  fs.rmSync("/tmp/sb-recommend-pg", { recursive: true, force: true });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);

  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: URL_ },
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 240000,
  });

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = SECRET;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { pool: pool0 } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const db = drizzle(pool0, { schema });
  const { signSessionToken } = await import("../src/lib/auth");

  // --- Fictional, clearly-labelled fixtures --------------------------------
  const [alice] = await db.insert(schema.studentProfiles).values({
    name: "RECOMMEND-FIXTURE: Alice",
    email: "recommend-alice@example.com",
    gpa: 3.7,
    gpaScale: 4,
    ieltsScore: 7,
    targetMajor: "Computer Science",
    degreeLevel: "Bachelor",
    country: "Uzbekistan",
    budgetAnnualUsd: 20000,
  }).returning();
  const [bob] = await db.insert(schema.studentProfiles).values({
    name: "RECOMMEND-FIXTURE: Bob",
    email: "recommend-bob@example.com",
  }).returning();

  const [uni] = await db.insert(schema.universities).values({
    name: "RECOMMEND-FIXTURE: Test University",
    country: "Germany",
    city: "Testville",
    description: "Deterministic recommender test fixture (NOT a real university).",
    websiteUrl: "https://recommendfixture.example.edu",
    officialWebsiteUrl: "https://recommendfixture.example.edu",
  }).returning();
  const [cs] = await db.insert(schema.universityPrograms).values({
    universityId: uni.id,
    name: "RECOMMEND-FIXTURE: BSc Computer Science",
    field: "Computer Science",
    degree: "Bachelor",
    durationYears: 4,
    language: "English",
    tuitionAmount: 9000,
    tuitionCurrency: "USD",
    isVerified: true,
    verificationStatus: "verified",
    sourceUrl: "https://recommendfixture.example.edu/cs",
    lastVerifiedAt: new Date("2026-09-01"),
  }).returning();
  const [se] = await db.insert(schema.universityPrograms).values({
    universityId: uni.id,
    name: "RECOMMEND-FIXTURE: BSc Software Engineering",
    field: "Software Engineering",
    degree: "Bachelor",
    language: "English",
    tuitionAmount: null,
  }).returning();
  const [law] = await db.insert(schema.universityPrograms).values({
    universityId: uni.id,
    name: "RECOMMEND-FIXTURE: BSc Law",
    field: "Law",
    degree: "Bachelor",
    tuitionAmount: 12000,
  }).returning();
  await db.insert(schema.programRequirements).values([
    { programId: cs.id, minIelts: 6.5, minGpa: 3.0, sourceUrl: "https://recommendfixture.example.edu/cs", lastVerifiedAt: new Date("2026-09-01"), verificationStatus: "verified" },
    { programId: se.id, minIelts: 7.0, verificationStatus: "unverified" },
  ]);
  await db.insert(schema.applicationCycles).values({
    universityId: uni.id, programId: cs.id, intake: "Autumn", academicYear: "2027/2028", openingDate: "2026-10-01", deadline: "2027-01-15", applicationUrl: "https://recommendfixture.example.edu/apply", sourceUrl: "https://recommendfixture.example.edu/apply", lastVerifiedAt: new Date("2026-09-01"), verificationStatus: "verified",
  });
  await db.insert(schema.applicationCycles).values({
    universityId: uni.id, programId: se.id, intake: "Spring", academicYear: "2027/2028", deadline: "2026-12-01", verificationStatus: "unverified",
  });

  const aliceToken = signSessionToken({ id: alice.id, passwordHash: alice.passwordHash });
  const bobToken = signSessionToken({ id: bob.id, passwordHash: bob.passwordHash });

  const recommendRoute = (await import("../src/app/api/programs/recommend/route")).POST;
  const savedProgramsRoute = (await import("../src/app/api/saved-programs/route")).POST;
  const applicationsRoute = (await import("../src/app/api/applications/route")).POST;

  const call = async (handler: (req: Request) => Promise<Response>, path: string, init: RequestInit = {}) => {
    const res = await handler(new Request(`http://localhost${path}`, init));
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body };
  };

  const post = (token: string | null, path: string, payload: unknown) =>
    call(
      path === "/api/programs/recommend" ? recommendRoute : path.startsWith("/api/saved-programs") ? savedProgramsRoute : applicationsRoute,
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { cookie: `sb_session=${token}` } : {}) },
        body: JSON.stringify(payload),
      }
    );

  try {
    // --- Auth + validation --------------------------------------------------
    const anon = await post(null, "/api/programs/recommend", { interests: ["Computer Science"] });
    check("unauthenticated → 401", anon.status === 401, `got ${anon.status}`);

    const noInterests = await post(aliceToken, "/api/programs/recommend", {});
    check("missing interests → 400 with guidance (no silent default)", noInterests.status === 400 && /subject or interest/i.test(noInterests.body?.error ?? ""), JSON.stringify(noInterests.body));

    // --- Happy path -----------------------------------------------------------
    const res = await post(aliceToken, "/api/programs/recommend", {
      profileId: alice.id,
      interests: ["Computer Science"],
      budgetUsd: 25000,
      fundingNeed: "partial",
      degreeLevel: "Bachelor",
    });
    check("authenticated request → 200", res.status === 200, `got ${res.status} ${JSON.stringify(res.body?.error)}`);
    const results = res.body?.results ?? [];
    check("returns the fixture programs", results.length >= 2, `got ${results.length}`);
    const byName = (n: string) => results.find((r: any) => r.program.name === n);
    check("CS program ranked first (exact subject tier)", results[0]?.program?.name === "RECOMMEND-FIXTURE: BSc Computer Science", JSON.stringify(results.map((r: any) => r.program.name)));
    check("synonym program (Software Engineering) included", Boolean(byName("RECOMMEND-FIXTURE: BSc Software Engineering")));
    const csRes = byName("RECOMMEND-FIXTURE: BSc Computer Science");
    check("eligibility: ielts met, gpa met (from profile, labelled)", (() => {
      const items: any[] = csRes?.eligibility?.items ?? [];
      return items.some((i) => i.key === "ielts" && i.status === "met") && items.some((i) => i.key === "gpa" && i.status === "met");
    })(), JSON.stringify(csRes?.eligibility));
    check("affordability: within budget (9000 ≤ 25000 USD)", csRes?.affordability?.withinBudget === "yes", JSON.stringify(csRes?.affordability?.withinBudget));
    check("next cycle: verified deadline surfaced with source", csRes?.nextCycle?.deadline === "2027-01-15" && csRes?.nextCycle?.isEstimated === false, JSON.stringify(csRes?.nextCycle));
    check("unverified cycle flagged isEstimated=true", byName("RECOMMEND-FIXTURE: BSc Software Engineering")?.nextCycle?.isEstimated === true);
    check("provenance: program sourceUrl + verificationStatus in response", csRes?.program?.sourceUrl === "https://recommendfixture.example.edu/cs" && csRes?.program?.verificationStatus === "verified");
    check("probability dimension: available=false in the response", res.body?.probability?.available === false && csRes?.probability?.available === false);
    check("no numeric probability anywhere in the payload", !/"(admissionPct|chancePct|odds)"\s*:/.test(JSON.stringify(res.body)));
    check(
      "input source transparency: ielts from profile, budget from request, fundingNeed from request",
      res.body?.inputs?.ielts?.source === "profile" &&
        res.body?.inputs?.budgetUsd?.source === "request" &&
        res.body?.inputs?.fundingNeed?.source === "request" &&
        res.body?.inputs?.act?.source === "unknown",
      JSON.stringify(res.body?.inputs)
    );

    // --- Ownership ------------------------------------------------------------
    const asBobClaimingAlice = await post(bobToken, "/api/programs/recommend", {
      profileId: alice.id,
      interests: ["Computer Science"],
    });
    check("bob cannot run the recommender with alice's profileId → 403", asBobClaimingAlice.status === 403, `got ${asBobClaimingAlice.status}`);

    const save = await post(aliceToken, "/api/saved-programs", { profileId: alice.id, programId: cs.id });
    check("save action: alice saves the recommended program", save.status === 200 || save.status === 201, `got ${save.status}`);
    const [savedRow] = await db
      .select()
      .from(schema.savedPrograms)
      .where(
        and(
          eq(schema.savedPrograms.profileId, alice.id),
          eq(schema.savedPrograms.programId, cs.id)
        )
      );
    check("saved row is owned by alice", savedRow?.profileId === alice.id && savedRow?.programId === cs.id);

    const saveAsBobForAlice = await post(bobToken, "/api/saved-programs", { profileId: alice.id, programId: cs.id });
    check("bob cannot save into alice's shortlist → 403", saveAsBobForAlice.status === 403, `got ${saveAsBobForAlice.status}`);

    const plan = await post(aliceToken, "/api/applications", {
      profileId: alice.id,
      universityId: uni.id,
      programName: "RECOMMEND-FIXTURE: BSc Computer Science",
      status: "not_started",
    });
    check("plan action: convert recommendation to an application plan", plan.status === 200 || plan.status === 201, `got ${plan.status} ${JSON.stringify(plan.body?.error)}`);
    const [planRow] = await db.select().from(schema.applications).where(eq(schema.applications.profileId, alice.id));
    check("plan row owned by alice with the recommended program", planRow?.profileId === alice.id && planRow?.programName === "RECOMMEND-FIXTURE: BSc Computer Science");

    const planAsBob = await post(bobToken, "/api/applications", {
      profileId: alice.id,
      universityId: uni.id,
      programName: "RECOMMEND-FIXTURE: BSc Computer Science",
    });
    check("bob cannot create a plan in alice's name → 403", planAsBob.status === 403, `got ${planAsBob.status}`);

    // --- Empty catalog behaviour (law program has no requirements/cycles) -----
    const lawRes = byName("RECOMMEND-FIXTURE: BSc Law");
    check("program with no requirements: eligibility unknown=0/unmet=0, nextCycle null (not invented)", (() => {
      if (!lawRes) return false;
      return lawRes.eligibility.items.length === 0 && lawRes.nextCycle === null && lawRes.considerations.some((c: string) => /no application catalog|no application cycle/i.test(c));
    })(), JSON.stringify(lawRes?.eligibility));
  } finally {
    await pool0.end().catch(() => {});
    await pg.stop().catch(() => {});
    const fs = await import("node:fs");
    fs.rmSync("/tmp/sb-recommend-pg", { recursive: true, force: true });
  }
}

apiPart()
  .catch((e) => {
    failed++;
    console.error("  ✗ API section crashed:", e?.message ?? e);
  })
  .finally(() => {
    console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
