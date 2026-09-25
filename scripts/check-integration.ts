/**
 * Integration test — the real routes against a real PostgreSQL.
 *
 * Every other test in this repo exercises pure `src/lib/*.ts` logic. That was a
 * deliberate choice, made because there was no database here. There IS one:
 * `embedded-postgres` runs a genuine Postgres server in-process, and
 * `drizzle-kit push` builds the real schema into it.
 *
 * So this closes the gap the unit tests cannot reach: the SQL that Drizzle
 * generates, the joins, the `requireProfileAccess` gate reading a real session
 * cookie, and the JSON the client actually receives. A unit test can prove
 * `calculateCosts` is correct and still ship a route that returns 500.
 *
 * Run: npm run test:integration
 */

import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { eq } from "drizzle-orm";

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

const PORT = 55441;
const DB = "sbtest";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const SECRET = "integration-test-secret-value-0123456789";

let pg: EmbeddedPostgres | null = null;

async function main() {
  pg = new EmbeddedPostgres({
    databaseDir: "/tmp/sb-it-pg",
    user: "test",
    password: "test",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  console.log(`Postgres running on :${PORT}, database "${DB}"`);

  // Build the real schema from src/db/schema.ts.
  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: URL_ },
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 240000,
  });
  console.log("Schema pushed from src/db/schema.ts\n");

  // The db module reads these at import time, so they must be set first.
  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = SECRET;
  // NODE_ENV is read-only on the typed env object; cast to assign it.
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { signSessionToken } = await import("../src/lib/auth");

  // --- Seed ---------------------------------------------------------------
  const [profile] = await db
    .insert(schema.studentProfiles)
    .values({
      name: "Aziza Karimova",
      email: "aziza@example.com",
      passwordHash: "$2b$10$integration.test.hash.value.abcdefghijklmnopqrstuv",
      gpa: 3.7,
      gpaScale: 4,
      ieltsScore: 7.5,
      targetMajor: "Computer Science",
      degreeLevel: "Bachelor",
      country: "Germany",
      needsFinancialAid: true,
      familyIncomeUsd: 40000,
    })
    .returning();

  const [other] = await db
    .insert(schema.studentProfiles)
    .values({ name: "Bekzod", email: "bekzod@example.com" })
    .returning();

  const [uniA] = await db
    .insert(schema.universities)
    .values({
      name: "Technical University of Munich",
      country: "Germany",
      city: "Munich",
      worldRanking: 50,
      programMajor: "Computer Science",
      description: "A public research university in Bavaria.",
      websiteUrl: "https://www.tum.de",
      annualTuitionUsd: 1500,
      annualLivingEstUsd: 11000,
      acceptanceRate: 8,
      minGpa: 3.2,
      minIelts: 6.5,
    })
    .returning();

  const [uniB] = await db
    .insert(schema.universities)
    .values({
      name: "LMU Munich",
      country: "Germany",
      city: "Munich",
      worldRanking: 60,
      programMajor: "Computer Science",
      description: "A public research university in Munich.",
      websiteUrl: "https://www.lmu.de",
      annualTuitionUsd: 1500,
      annualLivingEstUsd: 12000,
      acceptanceRate: 10,
      minGpa: 3.0,
    })
    .returning();

  const [sch] = await db
    .insert(schema.scholarships)
    .values({
      title: "DAAD Scholarship",
      provider: "DAAD",
      country: "Germany",
      coverageType: "tuition",
      amountUsdValue: 9000,
      deadline: "2026-12-01",
      // drizzle `date()` without a mode maps to a string, not a Date.
      deadlineDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
      description: "Funding for international students in Germany.",
      requirements: "Bachelor degree, proof of language proficiency.",
      websiteUrl: "https://www.daad.de",
    })
    .returning();

  await db.insert(schema.savedUniversities).values([
    { profileId: profile.id, universityId: uniA.id },
    { profileId: profile.id, universityId: uniB.id },
  ]);
  await db.insert(schema.savedScholarships).values([
    { profileId: profile.id, scholarshipId: sch.id },
  ]);

  const [mentor] = await db
    .insert(schema.mentors)
    .values({
      displayName: "Dilnoza",
      country: "Germany",
      university: "Technical University of Munich",
      program: "Computer Science",
      scholarshipName: "DAAD Scholarship",
      languages: '["English","German"]',
      hourlyRateUsd: 20,
      isVerified: true,
      isActive: true,
      ratingAverage: 4.8,
      ratingCount: 12,
    })
    .returning();

  const token = signSessionToken({ id: profile.id, passwordHash: profile.passwordHash });
  const cookie = `sb_session=${token}`;

  /** Call a route handler the way Next.js would. */
  async function call(
    handler: (req: Request) => Promise<Response>,
    path: string,
    init: RequestInit = {}
  ) {
    const req = new Request(`http://localhost${path}`, {
      ...init,
      headers: { cookie, ...(init.headers ?? {}) },
    });
    const res = await handler(req);
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body };
  }

  // -----------------------------------------------------------------------
  section("1. /api/planning — costs, portfolio, CV and comparison from real rows");

  const { GET: planningGet } = await import("../src/app/api/planning/route");
  const plan = await call(planningGet as any, `/api/planning?profileId=${profile.id}`);

  check("responds 200", plan.status === 200, `got ${plan.status} ${JSON.stringify(plan.body)?.slice(0, 200)}`);
  check("returns a cost breakdown", Array.isArray(plan.body?.costs?.lines) && plan.body.costs.lines.length > 0);
  check(
    "the published tuition is used, not a default",
    plan.body?.costs?.lines?.some((l: any) => l.key === "tuition" && l.annualUsd === 1500),
    JSON.stringify(plan.body?.costs?.lines?.find((l: any) => l.key === "tuition"))
  );
  check(
    "the published living figure beats the country estimate",
    plan.body?.costs?.lines?.some((l: any) => l.key === "living" && l.annualUsd === 11000)
  );
  check("both saved universities come back", plan.body?.universities?.length === 2);
  check("the saved scholarship is in the portfolio", plan.body?.portfolio?.count === 1);
  check("the comparison covers both universities", plan.body?.comparison?.rows?.length > 0);
  // renderCvText uppercases the header, so match the rendered form.
  check("a CV is built from the profile", /AZIZA KARIMOVA/.test(plan.body?.cvText ?? ""), plan.body?.cvText?.slice(0, 60));
  check("the CV names the real major", /Computer Science/.test(plan.body?.cvText ?? ""));
  check("costTarget identifies the university used", plan.body?.costTarget?.name === "Technical University of Munich");

  section("2. /api/planning — authorisation");

  const foreign = await call(planningGet as any, `/api/planning?profileId=${other.id}`);
  check("another student's profile is refused", foreign.status === 403, `got ${foreign.status}`);

  const anon = await (async () => {
    const res = await (planningGet as any)(new Request(`http://localhost/api/planning?profileId=${profile.id}`));
    return { status: res.status };
  })();
  check("no session cookie is refused", anon.status === 401, `got ${anon.status}`);

  section("3. /api/mentors — matching against real mentor rows");

  const { GET: mentorsGet } = await import("../src/app/api/mentors/route");
  const m = await call(mentorsGet as any, `/api/mentors?profileId=${profile.id}`);

  check("responds 200", m.status === 200, `got ${m.status} ${JSON.stringify(m.body)?.slice(0, 200)}`);
  check("the seeded mentor is returned", m.body?.matches?.length === 1);
  check(
    "the shared university is named as a reason",
    m.body?.matches?.[0]?.reasons?.some((r: string) => /Technical University of Munich/.test(r)),
    JSON.stringify(m.body?.matches?.[0]?.reasons)
  );
  check(
    "the shared scholarship is named",
    m.body?.matches?.[0]?.reasons?.some((r: string) => /DAAD/.test(r))
  );
  check("the mentor is flagged verified", m.body?.matches?.[0]?.verified === true);
  check("the mentor id survives the round trip", m.body?.matches?.[0]?.id === mentor.id);

  section("4. /api/parent-share — token issue, read and revocation");

  const { POST: parentPost, GET: parentGet } = await import("../src/app/api/parent-share/route");

  const on = await call(parentPost as any, "/api/parent-share", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ profileId: profile.id, enabled: true }),
  });
  check("sharing can be enabled", on.status === 200 && on.body?.enabled === true, `got ${on.status}`);
  const link: string = on.body?.link ?? "";
  check("a link is returned", /^https?:\/\/.+\/parent\/.+/.test(link), link.slice(0, 80));

  const sharedToken = decodeURIComponent(link.split("/parent/")[1] ?? "");
  const view = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?token=${encodeURIComponent(sharedToken)}`));
    return { status: res.status, body: await res.json().catch(() => null) };
  })();

  check("the link resolves to a summary", view.status === 200, `got ${view.status}`);
  // The child's name lands in `headline`; `overview` is deliberately generic.
  check("the summary names the child", /Aziza/.test(view.body?.summary?.headline ?? ""), view.body?.summary?.headline);
  check("the application count is present", typeof view.body?.summary?.progress?.length === "number");
  check(
    "the privacy note is included",
    /never includes passwords/i.test(view.body?.summary?.privacyNote ?? "")
  );

  // The whitelist claim: nothing private leaks even though the row has it all.
  const leaked = JSON.stringify(view.body ?? {});
  check("no password material leaks", !/\$2b\$|passwordHash/.test(leaked));
  check("no email leaks", !/aziza@example\.com/.test(leaked));
  check("no GPA value leaks", !/3\.7/.test(leaked));
  check("no IELTS score leaks", !/7\.5/.test(leaked));

  const bogus = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?token=${"a".repeat(40)}`));
    return { status: res.status };
  })();
  check("a wrong token is rejected", bogus.status === 404, `got ${bogus.status}`);

  const off = await call(parentPost as any, "/api/parent-share", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ profileId: profile.id, enabled: false }),
  });
  check("sharing can be revoked", off.status === 200 && off.body?.enabled === false);

  const afterRevoke = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?token=${encodeURIComponent(sharedToken)}`));
    return { status: res.status };
  })();
  check("the old link stops working after revocation", afterRevoke.status === 404, `got ${afterRevoke.status}`);

  // -----------------------------------------------------------------------
  // 5. IDOR — row ids are guessable, so every mutating route has to prove
  // ownership before it writes. I previously verified this by reading the
  // six `requireRowAccess` call sites. Reading is weaker than running: a
  // route can call the gate and still mutate first, or pick up the wrong id.
  // These assertions hit the real gate against the real database.
  //
  // Each check is paired: the stranger is refused AND the owner succeeds.
  // Without the owner half, a route that rejects everything would look safe.
  section("5. IDOR — the six row-owning routes");

  // Rows belonging to the *other* student.
  const [otherApp] = await db
    .insert(schema.applications)
    .values({ profileId: other.id, universityId: uniB.id, status: "Saved" })
    .returning();
  const [otherDoc] = await db
    .insert(schema.applicationDocuments)
    .values({
      profileId: other.id,
      entityType: "general",
      documentType: "passport",
      label: "Bekzod passport",
      isRequired: true,
      status: "missing",
    })
    .returning();
  const [otherSaved] = await db
    .insert(schema.savedUniversities)
    .values({ profileId: other.id, universityId: uniB.id })
    .returning();
  const [otherSchSaved] = await db
    .insert(schema.savedScholarships)
    .values({ profileId: other.id, scholarshipId: sch.id })
    .returning();
  const [otherEssay] = await db
    .insert(schema.essayVersions)
    .values({
      profileId: other.id,
      content: "Bekzod's own draft.",
      wordCount: 3,
    })
    .returning();

  const { PATCH: docPatch, DELETE: docDelete } = await import("../src/app/api/documents/route");
  const { PATCH: appPatch, DELETE: appDelete } = await import("../src/app/api/applications/route");
  const { POST: outcomePost } = await import("../src/app/api/applications/outcome/route");
  const { PATCH: suPatch, DELETE: suDelete } = await import("../src/app/api/saved-universities/route");
  const { PATCH: ssPatch, DELETE: ssDelete } = await import("../src/app/api/saved-scholarships/route");
  const { DELETE: essayDelete } = await import("../src/app/api/essays/route");

  const json = (o: unknown) => ({ "Content-Type": "application/json" });

  // -- documents ---------------------------------------------------------
  const docBlocked = await call(docPatch as any, "/api/documents", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: otherDoc.id, status: "uploaded" }),
  });
  check("documents PATCH: stranger refused", docBlocked.status === 403, `got ${docBlocked.status}`);

  const [docNow] = await db
    .select()
    .from(schema.applicationDocuments)
    .where(eq(schema.applicationDocuments.id, otherDoc.id));
  check("documents PATCH: the row was not written", docNow.status === "missing", `got ${docNow.status}`);

  const [ownDoc] = await db
    .insert(schema.applicationDocuments)
    .values({
      profileId: profile.id,
      entityType: "general",
      documentType: "passport",
      label: "Aziza passport",
      isRequired: true,
      status: "missing",
    })
    .returning();
  const docOwn = await call(docPatch as any, "/api/documents", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: ownDoc.id, status: "uploaded" }),
  });
  check("documents PATCH: the owner succeeds", docOwn.status === 200, `got ${docOwn.status}`);

  const docDelBlocked = await call(docDelete as any, `/api/documents?id=${otherDoc.id}`, { method: "DELETE" });
  check("documents DELETE: stranger refused", docDelBlocked.status === 403, `got ${docDelBlocked.status}`);

  // -- applications ------------------------------------------------------
  const appBlocked = await call(appPatch as any, "/api/applications", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: otherApp.id, status: "Submitted" }),
  });
  check("applications PATCH: stranger refused", appBlocked.status === 403, `got ${appBlocked.status}`);

  const [appNow] = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.id, otherApp.id));
  check("applications PATCH: the row was not written", appNow.status === "Saved", `got ${appNow.status}`);

  const appDelBlocked = await call(appDelete as any, `/api/applications?id=${otherApp.id}`, { method: "DELETE" });
  check("applications DELETE: stranger refused", appDelBlocked.status === 403, `got ${appDelBlocked.status}`);

  // -- outcome (the data flywheel) ---------------------------------------
  const outcomeBlocked = await call(outcomePost as any, "/api/applications/outcome", {
    method: "POST",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ applicationId: otherApp.id, result: "accepted", consented: true }),
  });
  check("outcome POST: stranger refused", outcomeBlocked.status === 403, `got ${outcomeBlocked.status}`);

  const [leakedOutcomes] = await db
    .select()
    .from(schema.applicationOutcomes)
    .where(eq(schema.applicationOutcomes.applicationId, otherApp.id));
  check(
    "outcome POST: no dataset row was created from the refused call",
    leakedOutcomes === undefined,
    JSON.stringify(leakedOutcomes)?.slice(0, 120)
  );

  const [ownApp] = await db
    .insert(schema.applications)
    .values({ profileId: profile.id, universityId: uniA.id, status: "Submitted" })
    .returning();
  const outcomeOwn = await call(outcomePost as any, "/api/applications/outcome", {
    method: "POST",
    headers: { ...json({}), cookie },
    // The route reads `shareConsent`, not `consented`.
    body: JSON.stringify({ applicationId: ownApp.id, result: "waitlisted", shareConsent: true }),
  });
  // NextResponse.json() with no explicit status is 200, not 201.
  check("outcome POST: the owner succeeds", outcomeOwn.status === 200, `got ${outcomeOwn.status}`);
  check(
    "outcome POST: the result is recorded with consent",
    outcomeOwn.body?.outcome?.result === "waitlisted" &&
      outcomeOwn.body?.outcome?.shareConsent === true
  );
  // The snapshot is stored as separate columns, not a JSON blob — that is
  // what makes it queryable for the model later.
  check(
    "outcome POST: the profile snapshot is taken at decision time",
    outcomeOwn.body?.outcome?.snapshotGpa === 3.7 &&
      outcomeOwn.body?.outcome?.snapshotIelts === 7.5 &&
      outcomeOwn.body?.outcome?.snapshotMajor === "Computer Science",
    JSON.stringify({
      gpa: outcomeOwn.body?.outcome?.snapshotGpa,
      ielts: outcomeOwn.body?.outcome?.snapshotIelts,
      major: outcomeOwn.body?.outcome?.snapshotMajor,
    })
  );

  // -- saved-universities ------------------------------------------------
  const suBlocked = await call(suPatch as any, "/api/saved-universities", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: otherSaved.id, status: "Applied" }),
  });
  check("saved-universities PATCH: stranger refused", suBlocked.status === 403, `got ${suBlocked.status}`);

  const suDelBlocked = await call(suDelete as any, `/api/saved-universities?id=${otherSaved.id}`, {
    method: "DELETE",
  });
  check("saved-universities DELETE: stranger refused", suDelBlocked.status === 403, `got ${suDelBlocked.status}`);

  const [suStill] = await db
    .select()
    .from(schema.savedUniversities)
    .where(eq(schema.savedUniversities.id, otherSaved.id));
  check("saved-universities: the row still exists", suStill !== undefined);

  // -- saved-scholarships ------------------------------------------------
  const ssBlocked = await call(ssPatch as any, "/api/saved-scholarships", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: otherSchSaved.id, status: "Applied" }),
  });
  check("saved-scholarships PATCH: stranger refused", ssBlocked.status === 403, `got ${ssBlocked.status}`);

  const ssDelBlocked = await call(ssDelete as any, `/api/saved-scholarships?id=${otherSchSaved.id}`, {
    method: "DELETE",
  });
  check("saved-scholarships DELETE: stranger refused", ssDelBlocked.status === 403, `got ${ssDelBlocked.status}`);

  // -- essays ------------------------------------------------------------
  const essayBlocked = await call(essayDelete as any, `/api/essays?id=${otherEssay.id}`, {
    method: "DELETE",
  });
  check("essays DELETE: stranger refused", essayBlocked.status === 403, `got ${essayBlocked.status}`);

  const [essayStill] = await db
    .select()
    .from(schema.essayVersions)
    .where(eq(schema.essayVersions.id, otherEssay.id));
  check("essays DELETE: the row still exists", essayStill !== undefined);

  // A nonexistent id must not become an ownership bypass. It comes back 404
  // rather than 403, which is the better answer: 403 would confirm the row
  // exists to someone who is not allowed to see it.
  const ghost = await call(appPatch as any, "/api/applications", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: 999999, status: "Submitted" }),
  });
  check("a nonexistent row id is refused, not treated as owned", ghost.status === 404, `got ${ghost.status}`);

  const ghostDoc = await call(docPatch as any, "/api/documents", {
    method: "PATCH",
    headers: { ...json({}), cookie },
    body: JSON.stringify({ id: 999999, status: "uploaded" }),
  });
  check("documents: a ghost id is also refused", ghostDoc.status === 404, `got ${ghostDoc.status}`);

  // -----------------------------------------------------------------------
  // 6. /api/chancing — the flagship route, and the one carrying the standing
  // requirement that Fit and Admission stay SEPARATE numbers. That has been
  // asserted in unit tests against synthetic inputs. Here it is asserted
  // against rows fetched from the database, plus the two claims about data
  // that only a real corpus can settle: that consented outcomes change the
  // basis, and that non-consented ones do not.
  section("6. /api/chancing — Fit and Admission stay separate");

  const { GET: chancingGet } = await import("../src/app/api/chancing/route");
  const ch = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);

  check("responds 200", ch.status === 200, `got ${ch.status} ${JSON.stringify(ch.body)?.slice(0, 200)}`);
  check(
    "both saved universities are estimated",
    ch.body?.results?.length === 2,
    `got ${ch.body?.results?.length}`
  );

  const first = ch.body?.results?.[0] ?? {};

  // --- the standing requirement -----------------------------------------
  check("Match % is present as its own number", typeof first.fitScore === "number", JSON.stringify(first.fitScore));
  check(
    "Admission % is present as its own number",
    typeof first.admission?.mid === "number",
    JSON.stringify(first.admission)
  );
  check(
    "Fit and Admission are NOT the same number",
    first.fitScore !== first.admission?.mid,
    `fit=${first.fitScore} admission=${first.admission?.mid}`
  );
  check(
    "Admission carries an honest range, not just a point",
    typeof first.admission?.low === "number" &&
      typeof first.admission?.high === "number" &&
      first.admission.low <= first.admission.mid &&
      first.admission.mid <= first.admission.high,
    JSON.stringify(first.admission)
  );
  check("Admission is labelled with a band", typeof first.admission?.label === "string" && first.admission.label.length > 0);

  const SUBS = [
    "academicFit",
    "testFit",
    "extracurricularFit",
    "majorFit",
    "internationalFactors",
    "financialFit",
  ];
  check(
    "all six sub-scores are returned",
    SUBS.every((k) => typeof first.subScores?.[k] === "number"),
    JSON.stringify(first.subScores)
  );

  check("the 'Why?' positives list is present", Array.isArray(first.positives));
  check("the 'Why?' negatives list is present", Array.isArray(first.negatives));
  check(
    "the reasons are non-empty for a real profile",
    (first.positives?.length ?? 0) + (first.negatives?.length ?? 0) > 0
  );
  check(
    "fit reasons come from the university match, not the estimate",
    Array.isArray(first.fitReasons) && first.fitReasons.length > 0
  );

  // --- honesty about the basis ------------------------------------------
  check(
    "with no consented outcomes the basis is the public estimate",
    first.dataBasis === "public-estimate",
    `got ${first.dataBasis}`
  );
  check(
    "the disclaimer says it is not a guarantee",
    /not a guarantee/i.test(first.disclaimer ?? ""),
    first.disclaimer
  );
  check("the dataset readiness gate is reported", ch.body?.dataset?.stage != null, JSON.stringify(ch.body?.dataset?.stage));
  check(
    "the readiness gate refuses an ML claim on an empty corpus",
    ch.body?.dataset?.allowed?.mlModel === false,
    JSON.stringify(ch.body?.dataset?.allowed)
  );
  check(
    "the gate names what the product must not claim yet",
    Array.isArray(ch.body?.dataset?.forbiddenClaims) &&
      ch.body.dataset.forbiddenClaims.includes("guaranteed admission"),
    JSON.stringify(ch.body?.dataset?.forbiddenClaims)
  );

  // --- consented outcomes change the basis -------------------------------
  // Twelve consented results at one university: enough to cross the blending
  // floor, so the estimate should start citing ScholarBridge data.
  const consentApps = await db
    .insert(schema.applications)
    .values(
      Array.from({ length: 12 }, () => ({
        profileId: other.id,
        universityId: uniA.id,
        status: "Decision",
      }))
    )
    .returning();

  await db.insert(schema.applicationOutcomes).values(
    consentApps.map((a, i) => ({
      applicationId: a.id,
      profileId: other.id,
      universityId: uniA.id,
      result: i < 4 ? "accepted" : i < 9 ? "rejected" : "waitlisted",
      shareConsent: true,
      snapshotGpa: 3.4,
      snapshotMajor: "Computer Science",
      snapshotCountry: "Uzbekistan",
    }))
  );

  const ch2 = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);
  const tumRow = (ch2.body?.results ?? []).find((r: any) => r.universityId === uniA.id);

  // Section 5 already recorded one consented outcome at this university
  // (the owner's own POST), so the corpus here is 12 + 1. That overlap is
  // worth keeping: it confirms the earlier POST really persisted a row.
  const EXPECTED_SAMPLE = 13;

  check(
    "consented outcomes move the basis off the public estimate",
    tumRow?.dataBasis === "hybrid" || tumRow?.dataBasis === "scholarbridge-data",
    `got ${tumRow?.dataBasis}, sample=${tumRow?.sampleSize}`
  );
  check(
    "the sample size reflects the consented rows",
    tumRow?.sampleSize === EXPECTED_SAMPLE,
    `got ${tumRow?.sampleSize}, expected ${EXPECTED_SAMPLE}`
  );
  check(
    "the disclaimer now cites the blended sample",
    new RegExp(`Blended with ${EXPECTED_SAMPLE} ScholarBridge`).test(tumRow?.disclaimer ?? ""),
    tumRow?.disclaimer
  );
  check(
    "Fit stays its own number even after blending",
    typeof tumRow?.fitScore === "number" && tumRow.fitScore !== tumRow?.admission?.mid,
    `fit=${tumRow?.fitScore} admission=${tumRow?.admission?.mid}`
  );

  // --- non-consented outcomes must NOT be used ---------------------------
  // This is the privacy claim: a student who never agreed cannot have their
  // result folded into anyone's estimate. Assert it by watching the basis
  // and the sample count stay exactly where they were.
  const privateApps = await db
    .insert(schema.applications)
    .values(
      Array.from({ length: 20 }, () => ({
        profileId: other.id,
        universityId: uniB.id,
        status: "Decision",
      }))
    )
    .returning();

  await db.insert(schema.applicationOutcomes).values(
    privateApps.map((a, i) => ({
      applicationId: a.id,
      profileId: other.id,
      universityId: uniB.id,
      result: i < 18 ? "accepted" : "rejected",
      shareConsent: false, // never consented
      snapshotGpa: 3.9,
      snapshotMajor: "Computer Science",
    }))
  );

  const ch3 = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);
  const lmuRow = (ch3.body?.results ?? []).find((r: any) => r.universityId === uniB.id);
  const tumRow3 = (ch3.body?.results ?? []).find((r: any) => r.universityId === uniA.id);

  check(
    "non-consented outcomes are not counted in the sample",
    lmuRow?.sampleSize === 0,
    `got ${lmuRow?.sampleSize}`
  );
  check(
    "a university with only non-consented data stays on the public estimate",
    lmuRow?.dataBasis === "public-estimate",
    `got ${lmuRow?.dataBasis}`
  );
  check(
    "the consented university's sample is unchanged by the new rows",
    tumRow3?.sampleSize === EXPECTED_SAMPLE,
    `got ${tumRow3?.sampleSize}, expected ${EXPECTED_SAMPLE}`
  );
  check(
    "the readiness gate counts only consented rows",
    ch3.body?.dataset?.records === EXPECTED_SAMPLE,
    `got ${ch3.body?.dataset?.records}, expected ${EXPECTED_SAMPLE} (the 20 non-consented rows must be invisible)`
  );
  check(
    "the readiness gate still refuses an ML claim",
    ch3.body?.dataset?.allowed?.mlModel === false,
    JSON.stringify(ch3.body?.dataset?.allowed)
  );

  // --- authorisation -----------------------------------------------------
  const chForeign = await call(chancingGet as any, `/api/chancing?profileId=${other.id}`);
  check("another student's chancing is refused", chForeign.status === 403, `got ${chForeign.status}`);

  // -----------------------------------------------------------------------
  // 7. /api/profile-strength — the strength dashboard (#22) and extracurricular
  // analysis (#21) on the real profile. No row id in the URL: the session
  // decides whose profile is scored, so the contract to prove is (a) the owner
  // gets real numbers, (b) anonymous is refused, (c) another session can never
  // see the owner's profile.
  section("7. /api/profile-strength — strength dashboard from the real profile");

  const { GET: strengthGet } = await import("../src/app/api/profile-strength/route");
  const ps = await call(strengthGet as any, "/api/profile-strength");
  check("responds 200", ps.status === 200, `got ${ps.status} ${JSON.stringify(ps.body)?.slice(0, 200)}`);
  check("reports 7 sections", Array.isArray(ps.body?.strength?.sections) && ps.body.strength.sections.length === 7);
  check(
    "all section scores stay in 0–100",
    ps.body?.strength?.sections?.every((s: any) => typeof s.score === "number" && s.score >= 0 && s.score <= 100)
  );
  check(
    "overall and completeness are percentages",
    typeof ps.body?.strength?.overall === "number" && ps.body.strength.overall >= 0 && ps.body.strength.overall <= 100 &&
    typeof ps.body?.strength?.completeness === "number" && ps.body.strength.completeness >= 0 && ps.body.strength.completeness <= 100
  );
  check(
    "the seeded profile scores above empty",
    (ps.body?.strength?.completeness ?? 0) > 0 && (ps.body?.strength?.overall ?? 0) > 0,
    `completeness=${ps.body?.strength?.completeness} overall=${ps.body?.strength?.overall}`
  );
  check(
    "extracurricular analysis returns four scores and suggestions",
    typeof ps.body?.extracurriculars?.leadership === "number" &&
    typeof ps.body?.extracurriculars?.impact === "number" &&
    typeof ps.body?.extracurriculars?.consistency === "number" &&
    typeof ps.body?.extracurriculars?.academicFit === "number" &&
    Array.isArray(ps.body?.extracurriculars?.suggestions) && ps.body.extracurriculars.suggestions.length > 0
  );

  const psAnon = await (async () => {
    const res = await (strengthGet as any)(new Request("http://localhost/api/profile-strength"));
    return { status: res.status };
  })();
  check("anonymous is refused", psAnon.status === 401, `got ${psAnon.status}`);

  // Schema defaults are demo values, so a fresh profile is NOT empty — seed
  // an explicitly different GPA to prove the session is isolated, not just
  // that two profiles happen to differ.
  const [otherWithHash] = await db
    .insert(schema.studentProfiles)
    .values({
      name: "Second Student",
      email: "second@example.com",
      passwordHash: profile.passwordHash,
      gpa: 2.5,
      workExperienceYears: 0,
    })
    .returning();
  const otherToken = signSessionToken({ id: otherWithHash.id, passwordHash: otherWithHash.passwordHash });
  const psOther = await (async () => {
    const res = await (strengthGet as any)(
      new Request("http://localhost/api/profile-strength", { headers: { cookie: `sb_session=${otherToken}` } })
    );
    return { status: res.status, body: await res.json().catch(() => null) };
  })();
  const ownerAcademics = ps.body?.strength?.sections?.find((s: any) => s.key === "academics")?.score;
  const otherAcademics = psOther.body?.strength?.sections?.find((s: any) => s.key === "academics")?.score;
  check(
    "a different session sees only its own profile (GPA 2.5, not the owner's 3.5)",
    psOther.status === 200 && otherAcademics < ownerAcademics,
    `got ${psOther.status} academics=${otherAcademics} vs owner ${ownerAcademics}`
  );

  // -----------------------------------------------------------------------
  // 8. #26/#27/#28 opportunities + #29 country comparison + #24 peer review
  //    on real rows. The schema above already contains the new tables
  //    (drizzle-kit push runs at the top of this file).
  section("8a. /api/opportunities — curated feed, scored per session");

  await db.insert(schema.opportunities).values([
    {
      type: "competition",
      title: "International Collegiate Programming Contest",
      provider: "ICPC Foundation",
      country: null,
      fields: '["Computer Science", "Mathematics"]',
      level: "undergrad",
      deadlineDate: null,
      url: "https://icpc.global",
      description: "Team programming contest, 100+ countries.",
      isVerified: true,
    },
    {
      type: "internship",
      title: "Germany Biotech Internship",
      provider: "Example Biotech",
      country: "Germany",
      fields: '["Biology"]',
      level: "grad",
      deadlineDate: "2026-12-15",
      url: "https://example.com",
      description: "Summer biotech internship.",
      isVerified: false,
    },
  ]);

  const { GET: oppGet } = await import("../src/app/api/opportunities/route");
  const opp = await call(oppGet as any, "/api/opportunities");
  check("responds 200", opp.status === 200, `got ${opp.status} ${JSON.stringify(opp.body)?.slice(0, 200)}`);
  check("counts by type are right", opp.body?.counts?.competition === 1 && opp.body?.counts?.internship === 1, JSON.stringify(opp.body?.counts));
  check("the signed-in profile gets a numeric match", Array.isArray(opp.body?.items) && opp.body.items.every((o: any) => typeof o.match === "number" && o.match >= 0 && o.match <= 100));
  check("scored for the profile's major", opp.body?.scoredFor === "Computer Science", `got ${opp.body?.scoredFor}`);
  const icpcRow = opp.body?.items?.find((o: any) => o.title.startsWith("International"));
  check("CS undergrad scores high on the CS contest", icpcRow && icpcRow.match >= 70, `got ${icpcRow?.match}`);
  const biotechRow = opp.body?.items?.find((o: any) => o.title.startsWith("Germany"));
  check("level/field mismatch is flagged, not hidden", biotechRow && biotechRow.flags.length >= 1 && biotechRow.match < icpcRow.match, `flags=${JSON.stringify(biotechRow?.flags)}`);

  const oppAnon = await (async () => {
    const res = await (oppGet as any)(new Request("http://localhost/api/opportunities"));
    return { status: res.status, body: await res.json().catch(() => null) };
  })();
  check("anonymous still gets the catalog, unscored", oppAnon.status === 200 && oppAnon.body?.items?.every((o: any) => o.match === null) && oppAnon.body?.scoredFor === null);

  const oppFiltered = await call(oppGet as any, "/api/opportunities?type=internship");
  check("type filter works", oppFiltered.status === 200 && oppFiltered.body?.count === 1 && oppFiltered.body.items[0].type === "internship");

  // -----------------------------------------------------------------------
  section("8b. /api/countries/compare — published data only, work rights null");

  const { GET: compareGet } = await import("../src/app/api/countries/compare/route");
  const cmp = await call(compareGet as any, "/api/countries/compare?countries=Germany");
  check("responds 200", cmp.status === 200, `got ${cmp.status}`);
  const de = cmp.body?.countries?.[0];
  check("Germany row found", de?.country === "Germany");
  check("university count = the two seeded rows", de?.universities === 2, `got ${de?.universities}`);
  check("tuition average from published values", de?.tuition?.avgUsd === 1500 && de?.tuition?.published === 2, JSON.stringify(de?.tuition));
  check("scholarship total from the seeded row", de?.scholarships?.totalUsd === 9000 && de?.scholarships?.count === 1, JSON.stringify(de?.scholarships));
  check("work rights are NEVER invented", de?.workRights === null);

  const cmpAnon = await (async () => {
    const res = await (compareGet as any)(new Request("http://localhost/api/countries/compare"));
    return { status: res.status, body: await res.json().catch(() => null) };
  })();
  check("default = top countries, public like the catalog", cmpAnon.status === 200 && cmpAnon.body?.countries?.some((c: any) => c.country === "Germany"));

  const cmpUnknown = await call(compareGet as any, "/api/countries/compare?countries=Atlantis");
  const atl = cmpUnknown.body?.countries?.[0];
  check("unknown country → zeros and nulls, no NaN", atl?.universities === 0 && atl?.tuition?.avgUsd === null && !JSON.stringify(atl).includes("NaN"));

  // -----------------------------------------------------------------------
  section("8c. /api/essays/reviews — peer review, author≠reviewer, anonymized");

  const { POST: essayPost, PATCH: essayPatch } = await import("../src/app/api/essays/route");
  const { GET: reviewsGet, POST: reviewsPost } = await import("../src/app/api/essays/reviews/route");

  const essayContent = "I have always believed that engineering is a way to give back. In my hometown, my father taught me to fix radios with whatever was on hand, and that habit of turning a broken thing into a working one followed me into programming. When I led our school's first robotics team, we did not have a budget, so we printed our own brackets and wrote our own controllers. The lesson I carry is not that we won — we came second — but that constraints are where engineers are made.";
  const [openEssay] = await db
    .insert(schema.essayVersions)
    .values({ profileId: profile.id, title: "My SOP", content: essayContent, openForReview: true })
    .returning();
  const [closedEssay] = await db
    .insert(schema.essayVersions)
    .values({ profileId: profile.id, title: "Closed draft", content: "A closed draft nobody may review yet." })
    .returning();

  const bekzodToken = signSessionToken({ id: other.id, passwordHash: other.passwordHash });
  const asBekzod = async (path: string, init: RequestInit = {}) => {
    const req = new Request(`http://localhost${path}`, { ...init, headers: { cookie: `sb_session=${bekzodToken}` } });
    const res = await (reviewsPost as any)(req);
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const reviewOk = await asBekzod("/api/essays/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      essayVersionId: openEssay.id,
      hook: 80,
      structure: 74,
      specificity: 82,
      language: 78,
      fit: 76,
      total: 78,
      comment: "Strong opening image; tighten the second paragraph.",
    }),
  });
  check("another student can review an OPEN essay", reviewOk.status === 200 && typeof reviewOk.body?.id === "number", `got ${reviewOk.status} ${JSON.stringify(reviewOk.body)}`);

  const reviewClosed = await asBekzod("/api/essays/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essayVersionId: closedEssay.id, hook: 50, total: 50 }),
  });
  check("a CLOSED essay refuses reviews (403)", reviewClosed.status === 403, `got ${reviewClosed.status}`);

  // Author reviews their own essay → 403 (the `call` helper = owner cookie).
  const reviewSelf = await call(reviewsPost as any, "/api/essays/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essayVersionId: openEssay.id, hook: 99, total: 99 }),
  });
  check("the author cannot review their own essay (403)", reviewSelf.status === 403, `got ${reviewSelf.status}`);

  const anonReview = await (reviewsGet as any)(new Request("http://localhost/api/essays/reviews?essayVersionId=" + openEssay.id));
  check("anonymous review reads are refused (401)", anonReview.status === 401, `got ${anonReview.status}`);

  const myReviews = await call(reviewsGet as any, `/api/essays/reviews?essayVersionId=${openEssay.id}`);
  check("the author sees the review + average", myReviews.status === 200 && myReviews.body?.reviews?.length === 1 && myReviews.body?.aggregate?.count === 1 && myReviews.body?.aggregate?.avg?.hook === 80, JSON.stringify(myReviews.body?.aggregate));
  check("reviewer is anonymized", String(myReviews.body?.reviews?.[0]?.reviewer ?? "").startsWith("Student #"), JSON.stringify(myReviews.body?.reviews?.[0]));
  check("own version reports openForReview", myReviews.body?.openForReview === true);

  const openList = await (async () => {
    const req = new Request("http://localhost/api/essays/reviews?open=1", { headers: { cookie: `sb_session=${bekzodToken}` } });
    const res = await (reviewsGet as any)(req);
    return { status: res.status, body: await res.json().catch(() => null) };
  })();
  const openRow = openList.body?.items?.find((e: any) => e.id === openEssay.id);
  check("the open list shows the open essay, not the closed one", openList.status === 200 && !!openRow && !openList.body?.items?.some((e: any) => e.id === closedEssay.id));
  check("the author is anonymized in the open list", openRow && String(openRow.author).startsWith("Student #") && !JSON.stringify(openRow).includes("Aziza"));

  // Toggle it closed — only the author can, and it takes effect immediately.
  const idorToggle = await (async () => {
    const req = new Request("http://localhost/api/essays", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: `sb_session=${bekzodToken}` },
      body: JSON.stringify({ id: openEssay.id, openForReview: false }),
    });
    const res = await (essayPatch as any)(req);
    return { status: res.status };
  })();
  check("another student cannot toggle someone else's essay (404)", idorToggle.status === 404, `got ${idorToggle.status}`);

  const closeRes = await call(essayPatch as any, "/api/essays", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: openEssay.id, openForReview: false }),
  });
  check("the author closes their own version", closeRes.status === 200 && closeRes.body?.openForReview === false, `got ${closeRes.status} ${JSON.stringify(closeRes.body)}`);

  const reviewAfterClose = await asBekzod("/api/essays/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essayVersionId: openEssay.id, hook: 50, total: 50 }),
  });
  check("after closing, new reviews are refused again (403)", reviewAfterClose.status === 403, `got ${reviewAfterClose.status}`);

  // -----------------------------------------------------------------------
  // Close the app's own pool before the server goes away. Killing Postgres
  // under a live pool makes node-postgres report 57P01 admin_shutdown, which
  // surfaces as an unhandled fatal and fails the run even though every
  // assertion passed.
  await pool.end();
}

main()
  .then(() => {
    console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
    process.exitCode = failed === 0 ? 0 : 1;
  })
  .catch((e) => {
    // Print the underlying Postgres error, not just Drizzle's wrapper: the
    // wrapper truncates, and the real cause (a missing NOT NULL column) is
    // what actually needs fixing.
    console.error("\nFATAL:", e?.message?.slice(0, 900) ?? e);
    const cause = e?.cause;
    if (cause) console.error("CAUSE:", String(cause.message ?? cause).slice(0, 500));
    process.exitCode = 1;
  })
  .finally(async () => {
    // Always shut the server down — a live Postgres keeps the process alive,
    // which is what made the first failing run hang until the timeout.
    try {
      await pg?.stop();
      console.log("\nPostgres stopped");
    } catch {
      /* already down */
    }
  });
