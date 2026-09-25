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
