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
import { eq, and, inArray } from "drizzle-orm";

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

  /** Notification lookup by (profileId, type) and optional link. */
  const andEq = (profileId: number, type: string, link?: string) =>
    link
      ? and(
          eq(schema.notifications.profileId, profileId),
          eq(schema.notifications.type, type),
          eq(schema.notifications.link, link)
        )
      : and(
          eq(schema.notifications.profileId, profileId),
          eq(schema.notifications.type, type)
        );

  // -----------------------------------------------------------------------
  // 0. Core-schema drift — production never runs `drizzle-kit push`, so a
  //    database created before an additive schema change keeps the old shape
  //    (this is what made the live dashboard answer 500/503: the session
  //    lookup selects the whole profile row, and `student_profiles.is_admin`
  //    existed only in schema.ts). Simulate exactly that on the freshly
  //    pushed database and prove the app repairs it and still answers.
  section("0. core-schema drift — the dashboard repairs an old database");

  const { CORE_TABLES, coreRepairStatements } = await import("../src/lib/core/ddl");
  const repairStatements = coreRepairStatements();
  check(
    "repair statements are additive only",
    repairStatements.length > 0 &&
      repairStatements.every((s) =>
        /^CREATE (TABLE|INDEX) IF NOT EXISTS |^ALTER TABLE .+ ADD COLUMN IF NOT EXISTS /.test(s)
      )
  );
  check(
    "no destructive SQL in the repair list",
    !repairStatements.some((s) => /\b(DROP|TRUNCATE|RENAME|ALTER COLUMN)\b/i.test(s))
  );

  await pool.query(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS is_admin`);
  await pool.query(`ALTER TABLE universities DROP COLUMN IF EXISTS official_website_url`);
  await pool.query(`DROP TABLE IF EXISTS programs CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS ai_evaluations CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS opportunities CASCADE`);

  const { GET: dashboardGet } = await import("../src/app/api/dashboard/route");
  const dash = await call(dashboardGet as any, `/api/dashboard?profileId=${profile.id}`);
  check(
    "the dashboard answers 200 on the drifted database",
    dash.status === 200,
    `got ${dash.status} ${JSON.stringify(dash.body)?.slice(0, 200)}`
  );
  check("the journey summary is present", typeof dash.body?.journey?.current === "string");
  check("the profile summary names the real student", dash.body?.profile?.name === "Aziza Karimova");

  const liveColumns = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`
  );
  const haveColumns = new Set(liveColumns.rows.map((r: { table_name: string; column_name: string }) => `${r.table_name}.${r.column_name}`));
  const { getTableName, getTableColumns } = await import("drizzle-orm");
  const stillMissing: string[] = [];
  for (const table of CORE_TABLES) {
    const name = getTableName(table as never);
    for (const col of Object.values(getTableColumns(table as never))) {
      const column = (col as { name: string }).name;
      if (!haveColumns.has(`${name}.${column}`)) stillMissing.push(`${name}.${column}`);
    }
  }
  check(
    "the repair restored every core table column",
    stillMissing.length === 0,
    stillMissing.slice(0, 5).join(", ")
  );

  const [repairedProfile] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, profile.id));
  check("is_admin is back and defaults to false (old rows stay non-admin)", repairedProfile?.isAdmin === false);

  for (const table of ["programs", "ai_evaluations", "opportunities"]) {
    const { rows } = await pool.query(`SELECT to_regclass($1) AS t`, [`public.${table}`]);
    check(`the dropped table ${table} was recreated`, rows[0]?.t !== null && rows[0]?.t !== undefined);
  }

  const dash2 = await call(dashboardGet as any, `/api/dashboard?profileId=${profile.id}`);
  check("a second request is unaffected (the repair is idempotent)", dash2.status === 200, `got ${dash2.status}`);

  // -----------------------------------------------------------------------
  section("0b. /api/universities — unspecified levels, aliases and explicit conflicts");

  const { GET: universitiesGet } = await import("../src/app/api/universities/route");
  type DiscoveryUniversity = {
    id: number;
    degreeLevel: string | null;
    annualTuitionUsd: number | null;
    worldRanking: number | null;
    matchScore: number | null;
  };
  const catalogue = async (query = "", init: RequestInit = {}) => {
    const result = await call(universitiesGet, `/api/universities${query ? `?${query}` : ""}`, init);
    const rows: DiscoveryUniversity[] = Array.isArray(result.body?.universities) ? result.body.universities : [];
    return { ...result, rows };
  };
  const includesUniversity = (result: Awaited<ReturnType<typeof catalogue>>, id: number) =>
    result.status === 200 && result.rows.some((row) => row.id === id);
  const bachelorQuery = `profileId=${profile.id}&degreeLevel=Bachelor`;

  // Simulate live-schema drift ONLY in this suite's throwaway embedded DB.
  // Reuse the existing university fixtures; never add a fake catalogue or
  // coerce NULL to "All". Restore both rows and the constraint in finally.
  await pool.query("ALTER TABLE universities ALTER COLUMN degree_level DROP NOT NULL");
  try {
    await db.update(schema.universities).set({ degreeLevel: "Master's" }).where(eq(schema.universities.id, uniB.id));
    for (const unspecified of [null, "", "   ", "Unknown", "Not specified", "N/A", "Uncatalogued level", "constructor"]) {
      await pool.query("UPDATE universities SET degree_level = $1 WHERE id = $2", [unspecified, uniA.id]);
      const list = await catalogue(bachelorQuery);
      check(
        `universities: the owner sees degree_level ${JSON.stringify(unspecified)} for Bachelor`,
        includesUniversity(list, uniA.id) && list.rows.find((row) => row.id === uniA.id)?.degreeLevel === unspecified,
        `status ${list.status}, ids ${list.rows.map((row) => row.id)}`
      );
      check(
        `universities: an explicit Master's-only row is absent alongside ${JSON.stringify(unspecified)}`,
        list.status === 200 && !list.rows.some((row) => row.id === uniB.id)
      );
    }

    await db.update(schema.universities).set({ degreeLevel: " aLL " }).where(eq(schema.universities.id, uniB.id));
    const allLevels = await catalogue(bachelorQuery);
    check("universities: All remains visible (case-insensitive, trimmed)", includesUniversity(allLevels, uniB.id));

    // Full labels, not substring guesses: undergraduate must not be mistaken
    // for graduate, and a postgraduate diploma must not be a Master's-only row.
    const degreeCases: [offered: string, requested: string, conflicting: string][] = [
      ["Bachelor", "Bachelor", "Master"],
      ["Bachelor’s degree", "Bachelor", "Master"],
      ["Undergraduate", "Bachelor", "Master"],
      ["  UNDERGRADUATE DEGREE  ", "Bachelor", "PhD"],
      ["Undergrad", "Bachelor", "Master"],
      ["B.Sc.", "Bachelor", "Master"],
      ["Bachelor (undergraduate)", "Bachelor", "Master"],
      ["Master’s-only", "Master", "Bachelor"],
      ["Graduate", "Master", "Bachelor"],
      ["Graduate degree", "Master", "Bachelor"],
      ["Postgraduate", "Master", "Bachelor"],
      ["Master (graduate)", "Master", "PhD"],
      ["Master (MS / MA)", "Master", "Bachelor"],
      ["M.Sc.", "Master", "Bachelor"],
      ["Ph.D.", "PhD", "Master"],
      ["Doctorate", "PhD", "Bachelor"],
      ["Doctoral degree", "PhD", "Master"],
      ["Doctor of Philosophy", "PhD", "Master"],
      ["PhD (doctoral)", "PhD", "Master"],
      ["DPhil", "PhD", "Master"],
      ["Diploma", "Diploma", "Master"],
      ["Postgraduate diploma", "Diploma", "Master"],
    ];
    for (const [offered, requested, conflicting] of degreeCases) {
      await db.update(schema.studentProfiles).set({ degreeLevel: requested }).where(eq(schema.studentProfiles.id, profile.id));
      await db.update(schema.universities).set({ degreeLevel: offered }).where(eq(schema.universities.id, uniA.id));
      await db.update(schema.universities).set({ degreeLevel: conflicting }).where(eq(schema.universities.id, uniB.id));
      const list = await catalogue(`profileId=${profile.id}&degreeLevel=${requested}`);
      check(
        `universities: ${offered} matches ${requested}, not ${conflicting} (raw value preserved)`,
        includesUniversity(list, uniA.id) && !list.rows.some((row) => row.id === uniB.id) &&
          list.rows.find((row) => row.id === uniA.id)?.degreeLevel === offered,
        `status ${list.status}, ids ${list.rows.map((row) => row.id)}`
      );
    }

    for (const [profileLevel, offered, conflicting] of [
      ["Undergraduate degree", "Bachelor", "Master"],
      ["Graduate degree", "Master", "Bachelor"],
      ["Doctoral degree", "PhD", "Master"],
    ]) {
      await db.update(schema.studentProfiles).set({ degreeLevel: profileLevel }).where(eq(schema.studentProfiles.id, profile.id));
      await db.update(schema.universities).set({ degreeLevel: offered }).where(eq(schema.universities.id, uniA.id));
      await db.update(schema.universities).set({ degreeLevel: conflicting }).where(eq(schema.universities.id, uniB.id));
      const list = await catalogue(`profileId=${profile.id}&degreeLevel=${conflicting}`);
      check(
        `universities: profile alias ${profileLevel} wins over the conflicting query`,
        includesUniversity(list, uniA.id) && !list.rows.some((row) => row.id === uniB.id)
      );
    }

    await db.update(schema.studentProfiles).set({ degreeLevel: "Bachelor" }).where(eq(schema.studentProfiles.id, profile.id));
    await db.update(schema.universities).set({ degreeLevel: "Bachelor / Master" }).where(eq(schema.universities.id, uniA.id));
    await db.update(schema.universities).set({ degreeLevel: "Master / PhD" }).where(eq(schema.universities.id, uniB.id));
    const multipleLevels = await catalogue(bachelorQuery);
    check(
      "universities: explicit multi-level records match any offered level, not a conflicting list",
      includesUniversity(multipleLevels, uniA.id) && !multipleLevels.rows.some((row) => row.id === uniB.id)
    );
    const cannotUnlock = await catalogue(`profileId=${profile.id}&degreeLevel=All`);
    check("universities: degreeLevel=All cannot bypass the owner's profile level", includesUniversity(cannotUnlock, uniA.id) && !cannotUnlock.rows.some((row) => row.id === uniB.id));

    // Ownership stays unchanged: another student's profileId (or an anonymous
    // caller) gets the public list, never personalised scores/private data.
    const otherUniversityCookie = `sb_session=${signSessionToken({ id: other.id, passwordHash: other.passwordHash })}`;
    for (const callerCookie of [otherUniversityCookie, ""]) {
      const publicList = await catalogue(`profileId=${profile.id}&degreeLevel=Graduate`, { headers: { cookie: callerCookie } });
      check(
        `universities: ${callerCookie ? "non-owner" : "anonymous"} cannot personalise against a foreign profile`,
        includesUniversity(publicList, uniB.id) && publicList.rows.every((row) => row.matchScore === null)
      );
    }

    // Missing numeric data must remain missing: adding degree visibility must
    // not turn NULL tuition/ranking into zero or change filter/sort semantics.
    await pool.query("UPDATE universities SET degree_level = NULL, annual_tuition_usd = NULL, world_ranking = NULL WHERE id = $1", [uniA.id]);
    await db.update(schema.universities).set({ degreeLevel: "All" }).where(eq(schema.universities.id, uniB.id));
    const unspecifiedNumbers = await catalogue(bachelorQuery);
    const unspecifiedRow = unspecifiedNumbers.rows.find((row) => row.id === uniA.id);
    check("universities: a NULL-level row with no numeric filters is visible, with NULLs intact", includesUniversity(unspecifiedNumbers, uniA.id) && unspecifiedRow?.degreeLevel === null && unspecifiedRow.annualTuitionUsd === null && unspecifiedRow.worldRanking === null);
    const unfiltered = await catalogue();
    check("universities: the unfiltered admin/public list still contains both rows", includesUniversity(unfiltered, uniA.id) && includesUniversity(unfiltered, uniB.id));

    for (const numericFilter of ["maxTuition=2000", "minRank=1", "maxRank=100"]) {
      const list = await catalogue(`${bachelorQuery}&${numericFilter}`);
      check(`universities: ${numericFilter} still excludes NULL, not the verified row`, includesUniversity(list, uniB.id) && !list.rows.some((row) => row.id === uniA.id));
    }
    const zeroTuition = await catalogue(`${bachelorQuery}&maxTuition=0`);
    check("universities: NULL tuition is never treated as free", zeroTuition.status === 200 && zeroTuition.rows.length === 0);
    for (const sort of ["tuition_asc", "tuition_desc"]) {
      const list = await catalogue(`${bachelorQuery}&sort=${sort}`);
      check(`universities: ${sort} still puts NULL tuition last`, list.status === 200 && list.rows[0]?.id === uniB.id && list.rows.at(-1)?.id === uniA.id);
    }
    const firstPage = await catalogue("degreeLevel=Bachelor&page=1&perPage=1");
    const lastPage = await catalogue("degreeLevel=Bachelor&page=2&perPage=1");
    check("universities: public rank sorting keeps NULL rank on the final page, not missing", firstPage.status === 200 && firstPage.rows[0]?.id === uniB.id && firstPage.body?.total === 2 && includesUniversity(lastPage, uniA.id) && lastPage.body?.page === 2);
  } finally {
    for (const uni of [uniA, uniB]) {
      await db.update(schema.universities).set({ degreeLevel: uni.degreeLevel, annualTuitionUsd: uni.annualTuitionUsd, worldRanking: uni.worldRanking }).where(eq(schema.universities.id, uni.id));
    }
    await db.update(schema.studentProfiles).set({ degreeLevel: profile.degreeLevel }).where(eq(schema.studentProfiles.id, profile.id));
    await pool.query("ALTER TABLE universities ALTER COLUMN degree_level SET NOT NULL");
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

  // The parent dashboard is a Premium feature and the route enforces that
  // server-side (PR #39). Grant Premium for this section only, then revoke it
  // again so the FREE-plan assertions further down still mean what they say.
  const premiumForParentShare = { isPremium: true, premiumUntil: new Date(Date.now() + 86400000) };
  await db.update(schema.studentProfiles).set(premiumForParentShare).where(eq(schema.studentProfiles.id, profile.id));

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

  await db
    .update(schema.studentProfiles)
    .set({ isPremium: false, premiumUntil: null })
    .where(eq(schema.studentProfiles.id, profile.id));

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
  // 6. /api/chancing — the flagship route. PROBABILITY POLICY (2026-10): the
  // admission probability dimension is NEVER returned as a number — the
  // response carries `probability: { available: false }` instead, and a fit
  // score must never be read as a probability. That is asserted here against
  // rows fetched from the database, plus the two claims about data that only
  // a real corpus can settle: that consented outcomes change the basis
  // (dataBasis/sampleSize), and that non-consented ones do not.
  section("6. /api/chancing — probability unavailable, fit stays its own number");

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
  check("Fit score is present as its own number", typeof first.fitScore === "number", JSON.stringify(first.fitScore));
  check(
    "admission probability is NEVER exposed as a number (policy)",
    first.probability?.available === false && first.admission === undefined,
    JSON.stringify({ probability: first.probability, admission: first.admission })
  );
  check(
    "no admission range object (mid/low/high/label) exists in the response",
    first.admission === undefined,
    JSON.stringify(first).slice(0, 200)
  );
  check(
    "Fit and the probability dimension stay separate (fit numeric, probability unavailable)",
    typeof first.fitScore === "number" && first.probability?.available === false,
    `fit=${first.fitScore} probability=${JSON.stringify(first.probability)}`
  );
  check(
    "probability dimension is labelled unavailable with a reason",
    first.probability?.available === false && typeof first.probability?.reason === "string" && first.probability.reason.length > 0,
    JSON.stringify(first.probability)
  );

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
    "probability policy is stated in the response (no validated methodology)",
    first.probability?.reason === "no-validated-methodology",
    JSON.stringify(first.probability)
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
    "blending is still reported via dataBasis + sampleSize — and still no numeric probability",
    (tumRow?.dataBasis === "hybrid" || tumRow?.dataBasis === "scholarbridge-data") &&
      typeof tumRow?.sampleSize === "number" &&
      tumRow?.probability?.available === false,
    `basis=${tumRow?.dataBasis} sample=${tumRow?.sampleSize} prob=${JSON.stringify(tumRow?.probability)}`
  );
  check(
    "Fit stays its own number even after blending",
    typeof tumRow?.fitScore === "number" && tumRow?.probability?.available === false,
    `fit=${tumRow?.fitScore} probability=${JSON.stringify(tumRow?.probability)}`
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

  // The essay studio is a Premium feature (`ai_essay`), enforced by the API
  // itself — a free account is refused before any review logic runs.
  const reviewFree = await asBekzod("/api/essays/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essayVersionId: openEssay.id, hook: 70, total: 70 }),
  });
  check(
    "a FREE account is refused by the API itself (403 premium_required)",
    reviewFree.status === 403 && reviewFree.body?.code === "premium_required" && reviewFree.body?.feature === "ai_essay",
    `got ${reviewFree.status} ${JSON.stringify(reviewFree.body)}`
  );

  // Grant both students Premium the way the product does (referral grant:
  // is_premium + premium_until) for the peer-review rules below; revoked at
  // the end of this section so later sections keep testing free accounts.
  const premiumUntil = new Date(Date.now() + 7 * 86400000);
  await db
    .update(schema.studentProfiles)
    .set({ isPremium: true, premiumUntil })
    .where(inArray(schema.studentProfiles.id, [profile.id, other.id]));

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
  check("after closing, new reviews are refused again (403, not a plan refusal)", reviewAfterClose.status === 403 && reviewAfterClose.body?.code !== "premium_required", `got ${reviewAfterClose.status} ${JSON.stringify(reviewAfterClose.body)}`);

  await db
    .update(schema.studentProfiles)
    .set({ isPremium: false, premiumUntil: null })
    .where(inArray(schema.studentProfiles.id, [profile.id, other.id]));

  // -----------------------------------------------------------------------
  section("8d. Access audit 2026-09 — ownership, Premium on the API, public data, AI quota");
  {
    const otherTok = signSessionToken({ id: other.id, passwordHash: other.passwordHash });
    const asOther = { cookie: `sb_session=${otherTok}` };
    const anon = { cookie: "" };
    const json = { "Content-Type": "application/json" };
    const setPremium = (ids: number[], on: boolean) =>
      db
        .update(schema.studentProfiles)
        .set({ isPremium: on, premiumUntil: on ? new Date(Date.now() + 7 * 86400000) : null })
        .where(inArray(schema.studentProfiles.id, ids));

    // Tasks — IDOR (row ids are sequential) + Premium `roadmap` on every method.
    const tasks = await import("../src/app/api/tasks/route");
    const [task] = await db
      .insert(schema.applicationTasks)
      .values({ profileId: profile.id, title: "Private task", dueDate: "2027-01-10" })
      .returning();
    const freeList = await call(tasks.GET as any, `/api/tasks?profileId=${profile.id}`);
    check("tasks: a FREE owner can use the basic roadmap", freeList.status === 200, `got ${freeList.status} ${JSON.stringify(freeList.body)?.slice(0,120)}`);
    await setPremium([profile.id, other.id], true);
    const ownList = await call(tasks.GET as any, `/api/tasks?profileId=${profile.id}`);
    check("tasks: a Premium owner lists their tasks", ownList.status === 200 && ownList.body?.tasks?.some((t: any) => t.id === task.id));
    const anonPatch = await call(tasks.PATCH as any, "/api/tasks", { method: "PATCH", headers: { ...anon, ...json }, body: JSON.stringify({ id: task.id, title: "pwned" }) });
    check("tasks: anonymous PATCH is refused (401)", anonPatch.status === 401, `got ${anonPatch.status}`);
    const otherPatch = await call(tasks.PATCH as any, "/api/tasks", { method: "PATCH", headers: { ...asOther, ...json }, body: JSON.stringify({ id: task.id, title: "pwned" }) });
    check("tasks: another Premium student cannot edit someone else's task (403)", otherPatch.status === 403, `got ${otherPatch.status}`);
    const otherDelete = await call(tasks.DELETE as any, `/api/tasks?id=${task.id}`, { method: "DELETE", headers: asOther });
    check("tasks: another student cannot delete someone else's task (403)", otherDelete.status === 403, `got ${otherDelete.status}`);
    const [stillThere] = await db.select().from(schema.applicationTasks).where(eq(schema.applicationTasks.id, task.id));
    check("tasks: the victim's task is untouched", stillThere?.title === "Private task");
    const badDate = await call(tasks.PATCH as any, "/api/tasks", { method: "PATCH", headers: json, body: JSON.stringify({ id: task.id, dueDate: "next week" }) });
    check("tasks: an invalid dueDate is rejected (400)", badDate.status === 400, `got ${badDate.status}`);
    const ownPatch = await call(tasks.PATCH as any, "/api/tasks", { method: "PATCH", headers: json, body: JSON.stringify({ id: task.id, isCompleted: true }) });
    check("tasks: the owner can complete their task", ownPatch.status === 200 && ownPatch.body?.task?.isCompleted === true, `got ${ownPatch.status}`);
    await setPremium([profile.id, other.id], false);

    // Forum — reading and writing need the `forum` feature; categories are admin-only.
    const cats = await import("../src/app/api/forum/categories/route");
    const threads = await import("../src/app/api/forum/threads/route");
    const anonThreads = await call(threads.GET as any, "/api/forum/threads", { headers: anon });
    check("forum: anonymous reads are refused (401)", anonThreads.status === 401, `got ${anonThreads.status}`);
    const freeThreads = await call(threads.GET as any, "/api/forum/threads");
    check("forum: a FREE account CAN read threads (read is free)", freeThreads.status === 200, `got ${freeThreads.status} ${JSON.stringify(freeThreads.body)?.slice(0,120)}`);
    const catAnon = await call(cats.POST as any, "/api/forum/categories", { method: "POST", headers: { ...anon, ...json }, body: JSON.stringify({ name: "Spam", slug: "spam" }) });
    const catStudent = await call(cats.POST as any, "/api/forum/categories", { method: "POST", headers: json, body: JSON.stringify({ name: "Spam", slug: "spam" }) });
    check("forum: categories cannot be created anonymously (401) or by a student (403)", catAnon.status === 401 && catStudent.status === 403, `got ${catAnon.status}/${catStudent.status}`);

    // Public leaderboard — no e-mail addresses.
    const lb = await import("../src/app/api/gamification/leaderboard/route");
    const { awardPoints } = await import("../src/lib/gamification");
    await awardPoints(profile.id, 5, "audit_check", null);
    const board = await call(lb.GET as any, "/api/gamification/leaderboard", { headers: anon });
    const rows: any[] = board.body?.leaderboard ?? [];
    check("leaderboard: public rows carry no e-mail", board.status === 200 && rows.length > 0 && rows.every((r) => !("email" in r)), JSON.stringify(rows[0] ?? null));

    // Manual point awards are admin-only (a student could top the board).
    const award = await import("../src/app/api/gamification/award/route");
    const selfAward = await call(award.POST as any, "/api/gamification/award", { method: "POST", headers: json, body: JSON.stringify({ profileId: profile.id, points: 999999 }) });
    check("gamification: a student cannot award themselves points (403)", selfAward.status === 403, `got ${selfAward.status}`);

    // Consulting / referrals act on the caller's own profile only.
    const consulting = await import("../src/app/api/consulting/route");
    const spoofConsult = await call(consulting.POST as any, "/api/consulting", { method: "POST", headers: { ...asOther, ...json }, body: JSON.stringify({ profileId: profile.id, topic: "spoofed" }) });
    const anonConsult = await call(consulting.POST as any, "/api/consulting", { method: "POST", headers: { ...anon, ...json }, body: JSON.stringify({ profileId: profile.id, topic: "spoofed" }) });
    check("consulting: requests cannot be filed for another profile (403) or anonymously (401)", spoofConsult.status === 403 && anonConsult.status === 401, `got ${spoofConsult.status}/${anonConsult.status}`);
    const referralsRoute = await import("../src/app/api/referrals/route");
    const spoofRef = await call(referralsRoute.POST as any, "/api/referrals", { method: "POST", headers: { ...asOther, ...json }, body: JSON.stringify({ profileId: profile.id, referralCode: "ANYCODE" }) });
    check("referrals: a code cannot be applied to someone else's profile (403)", spoofRef.status === 403, `got ${spoofRef.status}`);

    // Gemini Live tokens need an account.
    const live = await import("../src/app/api/visa/live-token/route");
    const anonLive = await call(live.POST as any, "/api/visa/live-token", { method: "POST", headers: { ...anon, ...json }, body: JSON.stringify({ countryCode: "US" }) });
    check("visa live-token: anonymous minting is refused (401)", anonLive.status === 401, `got ${anonLive.status}`);

    // Premium AI essay routes need an account with `ai_essay`.
    const draft = await import("../src/app/api/ai/draft-sop/route");
    const freeDraft = await call(draft.POST as any, "/api/ai/draft-sop", { method: "POST", headers: json, body: JSON.stringify({ profileId: profile.id, universityName: "X" }) });
    const anonDraft = await call(draft.POST as any, "/api/ai/draft-sop", { method: "POST", headers: { ...anon, ...json }, body: JSON.stringify({ universityName: "X" }) });
    check("AI draft-sop: FREE → 403 premium_required, anonymous → 401", freeDraft.status === 403 && freeDraft.body?.code === "premium_required" && anonDraft.status === 401, `got ${freeDraft.status}/${anonDraft.status}`);

    // Daily AI quota (admin config), counted per account from ai_usage.
    const { setConfig } = await import("../src/lib/config");
    const { guardAiRequest } = await import("../src/lib/ai/guard");
    const guardAs = (hdrs: Record<string, string>, body: Record<string, unknown>) =>
      guardAiRequest(new Request("http://localhost/api/ai/chat", { method: "POST", headers: { ...json, ...hdrs }, body: JSON.stringify(body) }));
    await setConfig("ai_free_requests_per_day", "2");
    const under = await guardAs({ cookie }, { profileId: profile.id, message: "hi" });
    check("AI quota: under the limit the request is allowed and charged to the caller", under.ok && under.usageProfileId === profile.id);
    await db.insert(schema.aiUsage).values([
      { profileId: profile.id, taskType: "general", provider: "test", model: "test" },
      { profileId: profile.id, taskType: "general", provider: "test", model: "test" },
    ]);
    const over = await guardAs({ cookie }, { profileId: profile.id, message: "hi" });
    const overBody = over.ok ? null : await over.response.json();
    check("AI quota: at the limit → 429 ai_quota_exceeded", !over.ok && over.response.status === 429 && overBody?.code === "ai_quota_exceeded", JSON.stringify(overBody));
    const noId = await guardAs({ cookie }, { message: "hi" });
    check("AI quota: dropping profileId does not escape the account quota", !noId.ok && noId.response.status === 429);
    await setPremium([profile.id], true);
    const premiumOk = await guardAs({ cookie }, { message: "hi" });
    check("AI quota: Premium uses the premium allowance", premiumOk.ok);
    await setPremium([profile.id], false);
    await setConfig("ai_free_requests_per_day", "5");
    await db.delete(schema.aiUsage).where(eq(schema.aiUsage.profileId, profile.id));
  }

  // -----------------------------------------------------------------------
  section("9. /api/saved-programs — program shortlist (spec §24)");

  const [prog] = await db
    .insert(schema.universityPrograms)
    .values({
      universityId: uniA.id,
      name: "M.Sc. Computer Science",
      field: "Computer Science",
      degree: "Master's",
      durationYears: 2,
      tuitionAmount: 1500,
    })
    .returning();

  const { GET: spGet, POST: spPost, DELETE: spDelete } = await import(
    "../src/app/api/saved-programs/route"
  );

  const spMissing = await call(spGet as any, "/api/saved-programs");
  check("saved-programs GET: profileId required", spMissing.status === 400, `got ${spMissing.status}`);

  const spAdd = await call(spPost as any, "/api/saved-programs", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({ profileId: profile.id, programId: prog.id }),
  });
  check("saved-programs POST: owner saves", spAdd.status === 200 && spAdd.body?.saved?.id != null, `got ${spAdd.status}`);

  const spDup = await call(spPost as any, "/api/saved-programs", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({ profileId: profile.id, programId: prog.id }),
  });
  check("saved-programs POST: idempotent, no duplicate row", spDup.status === 200 && spDup.body?.saved?.id === spAdd.body?.saved?.id);

  const spPhantom = await call(spPost as any, "/api/saved-programs", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({ profileId: profile.id, programId: 999999 }),
  });
  check("saved-programs POST: phantom program refused", spPhantom.status === 404, `got ${spPhantom.status}`);

  const spList = await call(spGet as any, `/api/saved-programs?profileId=${profile.id}`);
  check(
    "saved-programs GET: count and program join are right",
    spList.status === 200 && spList.body?.count === 1 && spList.body?.savedPrograms?.[0]?.program?.name === "M.Sc. Computer Science",
    JSON.stringify(spList.body).slice(0, 200)
  );

  const spOther = await call(spGet as any, `/api/saved-programs?profileId=${other.id}`, {
    headers: { cookie: `sb_session=${bekzodToken}` },
  });
  check("saved-programs GET: another profile sees nothing", spOther.status === 200 && spOther.body?.count === 0);

  const spDelBlocked = await call(spDelete as any, `/api/saved-programs?id=${spAdd.body?.saved?.id}`, {
    method: "DELETE",
    headers: { cookie: `sb_session=${bekzodToken}` },
  });
  check("saved-programs DELETE: stranger refused", spDelBlocked.status === 403, `got ${spDelBlocked.status}`);

  const spDel = await call(spDelete as any, `/api/saved-programs?id=${spAdd.body?.saved?.id}`, { method: "DELETE" });
  check("saved-programs DELETE: owner removes", spDel.status === 200);
  const spAfter = await call(spGet as any, `/api/saved-programs?profileId=${profile.id}`);
  check("saved-programs: the row is gone", spAfter.body?.count === 0);

  // -----------------------------------------------------------------------
  section("10. /api/visa/history + analyze persistence (spec §13)");

  const { GET: visaHistory } = await import("../src/app/api/visa/history/route");
  const { POST: visaAnalyze } = await import("../src/app/api/visa/analyze/route");

  // Seed one past session exactly the way POST /api/visa/analyze stores it.
  await db.insert(schema.aiEvaluations).values({
    profileId: profile.id,
    evaluationType: "Visa Practice",
    content: JSON.stringify({
      total: 61,
      purposeOfStudy: 60,
      funding: 55,
      homeTies: 62,
      nonImmigrantIntent: 58,
      specificity: 64,
      languageClarity: 62,
      country: "United States",
      homeCountry: "Germany",
      answerCount: 5,
    }),
  });

  const vhMissing = await call(visaHistory as any, "/api/visa/history");
  check("visa history GET: profileId required", vhMissing.status === 400);

  const vh1 = await call(visaHistory as any, `/api/visa/history?profileId=${profile.id}`);
  check(
    "visa history GET: the seeded session is returned",
    vh1.status === 200 && vh1.body?.count === 1 && vh1.body?.sessions?.[0]?.total === 61,
    JSON.stringify(vh1.body).slice(0, 200)
  );

  const vhBlocked = await call(visaHistory as any, `/api/visa/history?profileId=${profile.id}`, {
    headers: { cookie: `sb_session=${bekzodToken}` },
  });
  check("visa history GET: stranger refused", vhBlocked.status === 403, `got ${vhBlocked.status}`);

  // A fresh analysis WITH profileId persists a second session. The rubric is
  // deterministic, so this works with no model configured.
  const va1 = await call(visaAnalyze as any, "/api/visa/analyze", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({
      countryCode: "US",
      profileId: profile.id,
      messages: [
        { role: "officer", text: "Why do you want to study in the United States?" },
        { role: "user", text: "I want to pursue a master's in computer science because the machine learning curriculum is world-class." },
      ],
    }),
  });
  check("visa analyze: succeeds with profileId", va1.status === 200, `got ${va1.status} ${JSON.stringify(va1.body).slice(0, 120)}`);

  const vh2 = await call(visaHistory as any, `/api/visa/history?profileId=${profile.id}`);
  check(
    "visa history: the new session is appended, oldest first",
    vh2.body?.count === 2 && vh2.body?.sessions?.[0]?.total === 61 && (vh2.body?.sessions?.[1]?.total ?? 0) > 0,
    JSON.stringify(vh2.body).slice(0, 300)
  );

  // Without profileId the analysis still works but nothing is persisted.
  const before = vh2.body?.count;
  const va2 = await call(visaAnalyze as any, "/api/visa/analyze", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({
      countryCode: "US",
      messages: [
        { role: "officer", text: "What will you study?" },
        { role: "user", text: "Computer science, specifically data engineering, at a university in the United States." },
      ],
    }),
  });
  check("visa analyze: anonymous run still answers", va2.status === 200);
  const vh3 = await call(visaHistory as any, `/api/visa/history?profileId=${profile.id}`);
  check("visa history: anonymous run is not persisted", vh3.body?.count === before);

  // -----------------------------------------------------------------------
  section("11. /api/notifications/sweep — smart types (spec §25)");

  const { POST: sweep } = await import("../src/app/api/notifications/sweep/route");

  // A saved university whose IELTS bar (8.0) the student (7.5) does not clear.
  const [uniC] = await db
    .insert(schema.universities)
    .values({
      name: "ETH Zurich",
      country: "Switzerland",
      city: "Zurich",
      worldRanking: 20,
      programMajor: "Computer Science",
      description: "A public research university.",
      websiteUrl: "https://ethz.ch",
      minIelts: 8.0,
      minGpa: 3.5,
    })
    .returning();

  // uniA is already saved for the profile by the seed above.
  await db.insert(schema.savedUniversities).values([
    { profileId: profile.id, universityId: uniC.id },
  ]);

  // A scholarship in a saved country the student has NOT saved yet.
  const [sch2] = await db
    .insert(schema.scholarships)
    .values({
      title: "Test Foundation Grant",
      provider: "Test Foundation",
      country: "Germany",
      coverageType: "full",
      amountUsdValue: 15000,
      deadline: "2027-01-15",
      deadlineDate: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10),
      description: "A grant for international students in Germany.",
      requirements: "Bachelor degree with a strong GPA.",
      websiteUrl: "https://example.org/test-foundation",
    })
    .returning();

  // Two essay versions: 61 -> 76 (a 15-point improvement).
  await db.insert(schema.essayVersions).values([
    { profileId: profile.id, content: "First draft.", wordCount: 4, rubricTotal: 61 },
    { profileId: profile.id, content: "Second draft.", wordCount: 4, rubricTotal: 76 },
  ]);

  const sw1 = await call(sweep as any, "/api/notifications/sweep", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({ profileId: profile.id }),
  });
  check(
    "sweep: runs and creates the smart notifications",
    sw1.status === 200 && sw1.body?.ok === true && sw1.body?.created >= 3,
    `created=${sw1.body?.created}`
  );

  const [gapN] = await db
    .select()
    .from(schema.notifications)
    .where(andEq(profile.id, "requirement_gap"));
  check("sweep: requirement_gap flags the 8.0-IELTS university", gapN !== undefined && /IELTS/.test(gapN.title), gapN?.title);

  const [schN] = await db
    .select()
    .from(schema.notifications)
    .where(andEq(profile.id, "scholarship_opened", `/scholarships?id=${sch2.id}`));
  check("sweep: scholarship_opened names the matching scholarship", schN !== undefined && /Test Foundation Grant/.test(schN.title), schN?.title);

  const [essayN] = await db
    .select()
    .from(schema.notifications)
    .where(andEq(profile.id, "essay_improved"));
  check("sweep: essay_improved reports the 15-point gain", essayN !== undefined && /15/.test(essayN.title), essayN?.title);

  const sw2 = await call(sweep as any, "/api/notifications/sweep", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({ profileId: profile.id }),
  });
  check("sweep: a second run creates nothing new", sw2.body?.created === 0, `created=${sw2.body?.created}`);

  // -----------------------------------------------------------------------
  // 12. Re-audit 2026-10 — courses performance (A19), shared rate limits
  //     (A20), visa AI usage (A21), session revocation (A23), the deadlines
  //     plan policy (A15) and the instructors endpoint (A26).
  section("12. Re-audit 2026-10 — A19/A20/A21/A23/A15/A26");

  const { setConfig, deleteConfig } = await import("../src/lib/config");
  const { desc, sql } = await import("drizzle-orm");
  const jsonHdr = { "Content-Type": "application/json" };
  const anonHdr = { cookie: "" };

  // ---- A19: course listing — no N+1 re-seeding, no writes on read ---------
  const coursesRoute = await import("../src/app/api/courses/route");
  const countRows = async (table: any) => {
    const [r] = await db.select({ n: sql`count(*)::int` }).from(table);
    return Number(r.n);
  };
  const c1 = await call(coursesRoute.GET as any, "/api/courses", { headers: anonHdr });
  check(
    "courses: the anonymous catalogue lists published courses with count/progress fields",
    c1.status === 200 && Array.isArray(c1.body?.courses) && c1.body.courses.length >= 1 &&
      c1.body.courses.every((c: any) => typeof c.id === "number" && typeof c.lessonCount === "number" && typeof c.progressPct === "number"),
    JSON.stringify(c1.body?.courses?.[0])?.slice(0, 140)
  );
  const modsBefore = await countRows(schema.courseModules);
  const lessonsBefore = await countRows(schema.lessons);
  const c2 = await call(coursesRoute.GET as any, `/api/courses?profileId=${profile.id}`);
  check(
    "courses: a signed-in listing carries the caller's completed-lesson progress",
    c2.status === 200 && c2.body?.courses?.every((c: any) => typeof c.completedLessons === "number"),
    JSON.stringify(c2.body?.courses?.[0])?.slice(0, 140)
  );
  const modsAfter = await countRows(schema.courseModules);
  const lessonsAfter = await countRows(schema.lessons);
  check(
    "courses: repeated GETs perform NO writes (the old per-GET seed is gone)",
    modsBefore === modsAfter && lessonsBefore === lessonsAfter,
    `modules ${modsBefore}->${modsAfter}, lessons ${lessonsBefore}->${lessonsAfter}`
  );
  const seedRoute = await import("../src/app/api/admin/courses/seed/route");
  const seedAnon = await call(seedRoute.POST as any, "/api/admin/courses/seed", { method: "POST", headers: anonHdr, body: "{}" });
  check("courses seed: the explicit (re)seed endpoint is admin-only (401)", seedAnon.status === 401, `got ${seedAnon.status}`);

  // ---- A20: rate limits shared across instances ---------------------------
  const { checkSharedRateLimit } = await import("../src/lib/rate-limit-shared");
  const { resetRateLimits } = await import("../src/lib/rate-limit");
  const sharedKey = `it-shared:${Date.now()}`;
  const sr1 = await checkSharedRateLimit(sharedKey, { limit: 2, windowMs: 60_000 });
  const sr2 = await checkSharedRateLimit(sharedKey, { limit: 2, windowMs: 60_000 });
  const sr3 = await checkSharedRateLimit(sharedKey, { limit: 2, windowMs: 60_000 });
  check(
    "shared limiter: the budget is enforced (limit hits pass, the next is 429-shaped)",
    sr1.ok && sr2.ok && !sr3.ok && sr3.retryAfterSec >= 1 && sr3.remaining === 0,
    JSON.stringify(sr3)
  );
  resetRateLimits(); // simulate a brand-new app instance with empty memory
  const sr4 = await checkSharedRateLimit(sharedKey, { limit: 2, windowMs: 60_000 });
  check(
    "shared limiter: a NEW process does NOT get a fresh budget (counters live in Postgres)",
    !sr4.ok,
    JSON.stringify(sr4)
  );

  // ---- A21: visa AI usage is recorded; quota exclusion is deliberate ------
  const http = await import("http");
  let mockCalls = 0;
  const mockServer = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c: string) => (raw += c));
    req.on("end", () => {
      mockCalls++;
      const body = JSON.parse(raw || "{}");
      const text = JSON.stringify(body.messages ?? []);
      // The analyze prompt asks for "JSON ONLY"; the chat prompt is a normal
      // conversation. Content-based detection is robust to capability flags.
      const wantsJson = body.response_format?.type === "json_object" || /JSON ONLY/i.test(text);
      const content = wantsJson
        ? JSON.stringify({ confidence: 7, persuasiveness: 6, language_level: 7, estimated_visa_chance: 65, recommendations: "Answer more specifically about funding and home ties." })
        : "Good morning. May I see your offer letter?";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "mock", object: "chat.completion", model: "mock-model",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 111, completion_tokens: 22, total_tokens: 133 },
      }));
    });
  });
  await new Promise<void>((resolve) => mockServer.listen(55455, "127.0.0.1", resolve));
  process.env.AI_CUSTOM_API_KEY = "test-custom-key";
  process.env.AI_CUSTOM_BASE_URL = "http://127.0.0.1:55455/v1";
  process.env.AI_CUSTOM_MODEL = "mock-model";
  await setConfig("ai_provider_visa", "custom");
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.taskType, "visa"));

  const visaChatRoute = await import("../src/app/api/visa/chat/route");
  const visaAnalyzeRoute = await import("../src/app/api/visa/analyze/route");
  const vchat = await call(visaChatRoute.POST as any, "/api/visa/chat", {
    method: "POST", headers: jsonHdr, body: JSON.stringify({ countryCode: "US" }),
  });
  check("visa chat: a signed-in interview turn is answered", vchat.status === 200 && typeof vchat.body?.reply === "string" && vchat.body.reply.length > 0, JSON.stringify(vchat.body)?.slice(0, 120));
  const [visaUsage] = await db
    .select()
    .from(schema.aiUsage)
    .where(eq(schema.aiUsage.taskType, "visa"))
    .orderBy(desc(schema.aiUsage.createdAt));
  check(
    "visa chat: usage lands in ai_usage against the CALLER (admin stats complete, A21)",
    visaUsage?.profileId === profile.id && visaUsage?.promptTokens === 111 && visaUsage?.completionTokens === 22,
    JSON.stringify(visaUsage)
  );
  const vchatAnon = await call(visaChatRoute.POST as any, "/api/visa/chat", {
    method: "POST", headers: { ...jsonHdr, ...anonHdr }, body: JSON.stringify({ countryCode: "US" }),
  });
  const anonUsageRows = await db
    .select()
    .from(schema.aiUsage)
    .where(and(eq(schema.aiUsage.taskType, "visa"), sql`${schema.aiUsage.profileId} IS NULL`));
  check("visa chat: anonymous practice still works and is logged with a null profile", vchatAnon.status === 200 && anonUsageRows.length >= 1, `status ${vchatAnon.status}, rows ${anonUsageRows.length}`);
  const vanalyze = await call(visaAnalyzeRoute.POST as any, "/api/visa/analyze", {
    method: "POST", headers: jsonHdr,
    body: JSON.stringify({ countryCode: "US", messages: [{ role: "user", text: "I will study computer science and fund it myself." }, { role: "assistant", text: "Why that university?" }] }),
  });
  check("visa analyze: the model answer keeps its disclaimer and rubric", vanalyze.status === 200 && vanalyze.body?.aiAvailable === true && typeof vanalyze.body?.chanceDisclaimer === "string" && vanalyze.body?.rubric != null, JSON.stringify(vanalyze.body)?.slice(0, 120));
  // Deliberate, documented policy (audit A21): one interview is a multi-step
  // conversation, so the DAILY AI quota must not cut it off mid-interview.
  await setConfig("ai_free_requests_per_day", "0");
  const vchatZero = await call(visaChatRoute.POST as any, "/api/visa/chat", {
    method: "POST", headers: jsonHdr, body: JSON.stringify({ countryCode: "US" }),
  });
  check("visa chat: the daily AI quota is intentionally NOT applied (multi-step policy)", vchatZero.status === 200, `got ${vchatZero.status}`);
  await setConfig("ai_free_requests_per_day", "5");
  await deleteConfig("ai_provider_visa");
  mockServer.close();

  // ---- A23: server-side session revocation --------------------------------
  const { checkSessionRecord } = await import("../src/lib/auth");
  const makeDevice = async (label: string) => {
    const tok = signSessionToken({ id: profile.id, passwordHash: profile.passwordHash });
    await checkSessionRecord(tok, profile.id, { scope: "web", userAgent: label, ip: "127.0.0.1" });
    return tok;
  };
  const tokX = await makeDevice("Mozilla/5.0 Device X");
  const tokY = await makeDevice("Mozilla/5.0 Device Y");
  const sessionsRoute = await import("../src/app/api/sessions/route");
  const listX = await call(sessionsRoute.GET as any, "/api/sessions", { headers: { cookie: `sb_session=${tokX}` } });
  const seen = listX.body?.sessions ?? [];
  check(
    "sessions: the owner sees every device, exactly one marked current",
    listX.status === 200 && seen.length >= 2 && seen.filter((s: any) => s.current).length === 1 &&
      seen.every((s: any) => !("tokenHash" in s) && !("passwordHash" in s)),
    JSON.stringify(seen.map((s: any) => ({ id: s.id, current: s.current })))
  );
  // Target Device Y explicitly (the list also contains sessions created by
  // earlier sections — revoking "the first non-current" would hit one of those).
  const yRow = seen.find((s: any) => s.userAgent === "Mozilla/5.0 Device Y");
  const xRow = seen.find((s: any) => s.current);
  check("sessions: test setup found both dedicated devices", Boolean(yRow) && Boolean(xRow), JSON.stringify(seen.map((s: any) => ({ id: s.id, ua: s.userAgent }))));
  const revokeY = await call(sessionsRoute.POST as any, "/api/sessions", {
    method: "POST", headers: { ...jsonHdr, cookie: `sb_session=${tokX}` }, body: JSON.stringify({ sessionId: yRow.id }),
  });
  check("sessions: the owner can revoke another device", revokeY.status === 200 && revokeY.body?.revoked === 1, JSON.stringify(revokeY.body));
  const tasksRoute2 = await import("../src/app/api/tasks/route");
  const yAfter = await call(tasksRoute2.GET as any, `/api/tasks?profileId=${profile.id}`, { headers: { cookie: `sb_session=${tokY}` } });
  check("sessions: the revoked token dies with session_revoked (401)", yAfter.status === 401 && yAfter.body?.code === "session_revoked", `got ${yAfter.status} ${yAfter.body?.code}`);
  const xStill = await call(tasksRoute2.GET as any, `/api/tasks?profileId=${profile.id}`, { headers: { cookie: `sb_session=${tokX}` } });
  check("sessions: the owner's own device keeps working", xStill.status === 200, `got ${xStill.status}`);
  const selfRevoke = await call(sessionsRoute.POST as any, "/api/sessions", {
    method: "POST", headers: { ...jsonHdr, cookie: `sb_session=${tokX}` }, body: JSON.stringify({ sessionId: xRow.id }),
  });
  check("sessions: the current session cannot be revoked (sign out instead)", selfRevoke.status === 400 && selfRevoke.body?.code === "current_session", `got ${selfRevoke.status}`);
  const otherTok2 = signSessionToken({ id: other.id, passwordHash: other.passwordHash });
  await checkSessionRecord(otherTok2, other.id, { scope: "web", userAgent: "other", ip: "127.0.0.1" });
  const crossRevoke = await call(sessionsRoute.POST as any, "/api/sessions", {
    method: "POST", headers: { ...jsonHdr, cookie: `sb_session=${otherTok2}` }, body: JSON.stringify({ sessionId: xRow.id }),
  });
  check("sessions: another student cannot revoke your sessions (404, no existence leak)", crossRevoke.status === 404, `got ${crossRevoke.status}`);

  // ---- A15: the deadlines plan policy — free visibility, both channels ----
  const deadlinesRoute = await import("../src/app/api/deadlines/route");
  const freeDeadlines = await call(deadlinesRoute.GET as any, `/api/deadlines?profileId=${profile.id}`);
  check("deadlines: a FREE account gets the full deadline list from the web API", freeDeadlines.status === 200 && Array.isArray(freeDeadlines.body?.items), `got ${freeDeadlines.status}`);
  const { readFileSync: readFile2 } = await import("node:fs");
  const deadlinesSrc = readFile2("src/app/api/deadlines/route.ts", "utf8");
  check("deadlines: the web API has no premium gate (policy: visibility is free)", !/premiumGate|requireFeatureSession/.test(deadlinesSrc));
  const botSrc = readFile2("src/lib/telegram/bot.ts", "utf8");
  const botDeadlinesFn = botSrc.slice(botSrc.indexOf("async function deadlines"), botSrc.indexOf("async function next"));
  check("deadlines: the Telegram /deadlines list is FREE (policy: same data, every channel)", botDeadlinesFn.length > 0 && !/hasFeature|premium/.test(botDeadlinesFn));

  // ---- A26: the instructors endpoint is admin-only and validated ----------
  const instructorsRoute = await import("../src/app/api/admin/instructors/route");
  const otherHdr2 = { cookie: `sb_session=${otherTok2}` };
  const instAnon = await call(instructorsRoute.GET as any, "/api/admin/instructors", { headers: anonHdr });
  const instStudent = await call(instructorsRoute.GET as any, "/api/admin/instructors", { headers: otherHdr2 });
  const instAnonPost = await call(instructorsRoute.POST as any, "/api/admin/instructors", { method: "POST", headers: { ...jsonHdr, ...anonHdr }, body: JSON.stringify({ type: "instructor", name: "x" }) });
  check("instructors: the admin endpoint refuses anonymous (401) and student (403) access", instAnon.status === 401 && instStudent.status === 403 && instAnonPost.status === 401, `got ${instAnon.status}/${instStudent.status}/${instAnonPost.status}`);

  // -----------------------------------------------------------------------
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
    // Exit explicitly: embedded-postgres registers async-exit-hook, whose
    // `beforeExit` handler calls process.exit(0) and would silently turn a
    // failed run (process.exitCode = 1) into a green one in CI.
    process.exit(process.exitCode ?? 0);
  });
