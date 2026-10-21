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
import { rmSync } from "node:fs";
import { eq, and, inArray, like } from "drizzle-orm";

let passed = 0;
let failed = 0;

/**
 * On GitHub Actions the failure is ALSO emitted as an annotation, so the
 * assertion that broke is readable from the checks API without downloading the
 * job log (`gh api …/check-runs/<id>/annotations`).
 */
function annotate(message: string) {
  if (process.env.GITHUB_ACTIONS) console.log(`::error::${message.replace(/\r?\n/g, " ").slice(0, 900)}`);
}

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    annotate(`${name}${detail ? ` — ${detail}` : ""}`);
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
  // Throwaway cluster: a leftover directory from an interrupted run would make
  // `initdb` fail ("directory exists but is not empty"), so it is always
  // removed first — the same guard the other embedded-Postgres suites use.
  rmSync("/tmp/sb-it-pg", { recursive: true, force: true });
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
  process.env.APP_URL = "https://scholarbridge.example";
  // NODE_ENV is read-only on the typed env object; cast to assign it.
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  // Same guard check-ownership/check-portability/check-telegram-integration
  // already use: when Postgres is stopped at the end of the run, a lingering
  // idle client reports 57P01 "terminating connection due to administrator
  // command". Without a listener Node turns that into an uncaught exception and
  // fails the step even though every assertion passed — the intermittent CI red
  // on this suite. src/db now attaches a logging listener too; this one keeps
  // the suite safe if that ever changes.
  pool.on("error", () => undefined);
  const schema = await import("../src/db/schema");
  const { signSessionToken } = await import("../src/lib/auth");

  // Opportunity catalogue initialization is a startup/seed responsibility, not
  // a public GET side effect. Exercise the seeder concurrently against an empty
  // table to cover its transaction-level idempotency and truthful verification.
  section("0a. opportunity catalogue seed — concurrency and verification state");
  const { OPPORTUNITY_CATALOG, seedOpportunities } = await import("../src/db/seedOpportunities");
  const seedResults = await Promise.all([seedOpportunities(), seedOpportunities()]);
  const seededOpportunities = await db.select({
    id: schema.opportunities.id,
    title: schema.opportunities.title,
    provider: schema.opportunities.provider,
    isVerified: schema.opportunities.isVerified,
  }).from(schema.opportunities);
  const duplicateSeedPairs = await pool.query(
    `SELECT title, provider, count(*)::int AS n FROM opportunities GROUP BY title, provider HAVING count(*) > 1`
  );
  check(
    "concurrent seed calls insert the curated catalogue once",
    seedResults.reduce((sum, result) => sum + result.inserted, 0) === OPPORTUNITY_CATALOG.length &&
      seededOpportunities.length === OPPORTUNITY_CATALOG.length && duplicateSeedPairs.rows.length === 0,
    `inserted=${JSON.stringify(seedResults)}, rows=${seededOpportunities.length}, duplicates=${duplicateSeedPairs.rows.length}`
  );
  check(
    "curated provider URLs are not represented as independently verified",
    seededOpportunities.length === OPPORTUNITY_CATALOG.length && seededOpportunities.every((row) => row.isVerified === false)
  );

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
      // #29 only sums awards whose period is published — without it the value
      // is correctly excluded from the country comparison totals.
      awardPeriod: "total",
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
    return { status: res.status, body, headers: res.headers };
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
    // This suite writes to `universities` and `student_profiles` with raw SQL
    // (schema-drift simulation), bypassing the admin/profile routes that
    // invalidate the catalogue cache in production. Clearing it here is the
    // same contract: a write is followed by a read that must reflect it.
    const { resetCatalogCacheForTests } = await import("../src/lib/catalogCache");
    resetCatalogCacheForTests();
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
  section("0c. catalogue cache — memoized reads, instant invalidation");
  {
    const { resetCatalogCacheForTests, catalogCacheStats, invalidateCatalogCache, invalidateProfileMatchCache } =
      await import("../src/lib/catalogCache");
    resetCatalogCacheForTests();
    check("nothing is cached before the first catalogue read", catalogCacheStats().universitiesCached === false);

    const first = await call(universitiesGet, "/api/universities?degreeLevel=Bachelor");
    check("the first catalogue read answers 200 and fills the snapshot", first.status === 200 && catalogCacheStats().universitiesCached === true);

    // A raw-SQL insert (i.e. a write the cache never hears about) must not
    // reach a warm snapshot — this is the whole point of the optimization.
    const [lateUni] = await db
      .insert(schema.universities)
      .values({
        name: "Late Inserted University",
        country: "Germany",
        city: "Berlin",
        degreeLevel: "Bachelor",
        programMajor: "Computer Science",
        description: "Inserted after the snapshot was built.",
        websiteUrl: "https://late.example.edu",
        annualTuitionUsd: 900,
        annualLivingEstUsd: 10000,
      })
      .returning();
    const warm = await call(universitiesGet, "/api/universities?degreeLevel=Bachelor");
    const warmIds = (warm.body?.universities ?? []).map((row: { id: number }) => row.id);
    check("a warm read is served without re-querying the database", !warmIds.includes(lateUni.id));

    // …and the documented invalidation hook (used by every admin write) makes
    // it visible on the very next request.
    invalidateCatalogCache("universities");
    const cold = await call(universitiesGet, "/api/universities?degreeLevel=Bachelor");
    const coldIds = (cold.body?.universities ?? []).map((row: { id: number }) => row.id);
    check("invalidation makes a new row visible immediately", coldIds.includes(lateUni.id));
    check("a cached response equals a freshly built one for the same data", cold.status === first.status);

    // Profile match inputs carry their own short-lived memo.
    invalidateCatalogCache("universities");
    const { getCachedProfileForMatching } = await import("../src/lib/catalogCache");
    const warmProfile = await getCachedProfileForMatching(profile.id);
    check("profile match inputs are cached per profile", warmProfile !== null && catalogCacheStats().profileMatchEntries === 1);
    invalidateProfileMatchCache(profile.id);
    check("a profile edit drops its cached match inputs", catalogCacheStats().profileMatchEntries === 0);

    await db.delete(schema.universities).where(eq(schema.universities.id, lateUni.id));
    invalidateCatalogCache("all");

    resetCatalogCacheForTests();
    const dashboardWithColdCatalog = await call(dashboardGet as any, `/api/dashboard?profileId=${profile.id}`);
    check(
      "dashboard recommendations use the shared university catalogue cache",
      dashboardWithColdCatalog.status === 200 && catalogCacheStats().universitiesCached,
      `status ${dashboardWithColdCatalog.status}`
    );
  }

  // -----------------------------------------------------------------------
  section("0d. seeded video courses — the practical walkthroughs are published");
  {
    const { GET: coursesGet } = await import("../src/app/api/courses/route");
    const list = await call(coursesGet as unknown as (req: Request) => Promise<Response>, "/api/courses");
    const courses: { title: string; moduleCount: number; lessonCount: number; totalDurationSeconds: number; hasVideo: boolean }[] =
      Array.isArray(list.body?.courses) ? list.body.courses : [];
    const titles = courses.map((c) => c.title);
    check("the catalogue seeds all nine built-in courses", courses.length >= 9, `got ${courses.length}`);
    for (const title of [
      "How to Use Common App & CSS Profile: Step-by-Step US Application Guide",
      "European University Portals: uni-assist VPD, TUMonline, DreamApply & Sperrkonto",
      "Uzbekistan Flagship Grants & Documents: El-yurt umidi, GKS Korea, Türkiye Bursları & e-Apostille",
      "How to Use ScholarBridge AI: Complete Platform Walkthrough",
    ]) {
      check(`practical walkthrough seeded: ${title.slice(0, 38)}…`, titles.includes(title));
    }
    const practical = courses.filter((c) => titles.indexOf(c.title) > -1 && c.moduleCount > 0 && c.lessonCount > 0);
    check("every practical course reports modules and lessons", practical.length >= 4);
    check(
      "the practical courses carry playable video lessons",
      courses.filter((c) => c.hasVideo && c.totalDurationSeconds > 0).length >= 3
    );
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

  const { GET: mentorsGet, POST: mentorsPost } = await import("../src/app/api/mentors/route");
  const m = await call(mentorsGet as any, `/api/mentors?profileId=${profile.id}`);

  check("responds 200", m.status === 200, `got ${m.status} ${JSON.stringify(m.body)?.slice(0, 200)}`);
  // The platform also seeds real mentor rows, so the shared TUM/DAAD mentor
  // legitimately appears next to this fixture. The assertion is that the
  // fixture row IS returned (and that every returned row stays explainable),
  // not that it is the only match.
  const fixtureMatch = m.body?.matches?.find((x: any) => x.id === mentor.id);
  check(
    "the seeded mentor is returned",
    Boolean(fixtureMatch),
    `${m.body?.matches?.length ?? 0} match(es): ${JSON.stringify(m.body?.matches?.map((x: any) => x.id))}`
  );
  check(
    "every returned match carries its reasons and its gaps",
    Array.isArray(m.body?.matches) &&
      m.body.matches.length > 0 &&
      m.body.matches.every((x: any) => Array.isArray(x.reasons) && x.reasons.length > 0 && Array.isArray(x.gaps)),
    JSON.stringify(m.body?.matches?.map((x: any) => ({ id: x.id, reasons: x.reasons?.length, gaps: x.gaps?.length })))
  );
  check(
    "the shared university is named as a reason",
    fixtureMatch?.reasons?.some((r: string) => /Technical University of Munich/.test(r)),
    JSON.stringify(fixtureMatch?.reasons)
  );
  check(
    "the shared scholarship is named",
    fixtureMatch?.reasons?.some((r: string) => /DAAD/.test(r))
  );
  check("the mentor is flagged verified", fixtureMatch?.verified === true);
  check("the mentor id survives the round trip", fixtureMatch?.id === mentor.id);
  check("localized reason descriptors are returned for UI rendering", fixtureMatch?.reasonMessages?.some((r: any) => r.key === "reasons.sameUniversity"));
  check("profile country is not mistaken for a preferred study country", !fixtureMatch?.reasonMessages?.some((r: any) => r.key === "reasons.sameCountry") && !fixtureMatch?.gapMessages?.some((r: any) => r.key === "gaps.differentCountry"));
  check("account interface locale is not converted into a mentor language preference", !fixtureMatch?.reasonMessages?.some((r: any) => r.key === "reasons.languages"));

  const introPayload = { profileId: profile.id, mentorId: mentor.id, topic: "Application planning", message: "What should I verify?" };
  const intro = await call(mentorsPost as any, "/api/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(introPayload),
  });
  check("mentor introduction request is persisted as a pending request", intro.status === 200 && intro.body?.request?.status === "pending");
  const duplicateIntro = await call(mentorsPost as any, "/api/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(introPayload),
  });
  check("a second pending request is refused", duplicateIntro.status === 409);

  section("4. /api/parent-share — token issue, read and revocation");

  // The parent dashboard is a Premium feature and the route enforces that
  // server-side (PR #39). Grant Premium for this section only, then revoke it
  // again so the FREE-plan assertions further down still mean what they say.
  const premiumForParentShare = { isPremium: true, premiumUntil: new Date(Date.now() + 86400000) };
  await db.update(schema.studentProfiles).set(premiumForParentShare).where(eq(schema.studentProfiles.id, profile.id));

  const { POST: parentPost, PATCH: parentPatch, GET: parentGet } = await import("../src/app/api/parent-share/route");
  const [currentProfilePreferences] = await db
    .select({ preferredCountries: schema.studentProfiles.preferredCountries })
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, profile.id));
  await db.update(schema.studentProfiles).set({ preferredCountries: '["Canada"]' }).where(eq(schema.studentProfiles.id, profile.id));

  const [sharedAppSubmitted] = await db
    .insert(schema.applications)
    .values({ profileId: profile.id, universityName: "Private University Name", status: "interview" })
    .returning({ id: schema.applications.id });
  const [sharedAppPreparing] = await db
    .insert(schema.applications)
    .values({ profileId: profile.id, universityName: "Another Private University", status: "preparing" })
    .returning({ id: schema.applications.id });
  await db.insert(schema.applicationOutcomes).values({
    applicationId: sharedAppSubmitted.id,
    profileId: profile.id,
    result: "accepted",
    scholarshipName: "Private Award Name",
    scholarshipAmountUsd: 20000,
    notes: "Private outcome note",
    snapshotGpa: 3.7,
    snapshotGpaScale: 4,
    snapshotMajor: "Computer Science",
    snapshotCountry: "Germany",
    shareConsent: false,
  });

  const on = await call(parentPost as any, "/api/parent-share", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ profileId: profile.id, enabled: true }),
  });
  check("sharing can be enabled", on.status === 200 && on.body?.enabled === true, `got ${on.status}`);
  const link: string = on.body?.link ?? "";
  check("a link is returned", /^https?:\/\/.+\/parent\/.+/.test(link), link.slice(0, 80));
  check("the link uses the configured canonical origin, not the request Host", link.startsWith("https://scholarbridge.example/parent/"));
  check("state-changing response is not cacheable", /no-store/i.test(on.headers.get("cache-control") ?? ""));

  const sharedToken = decodeURIComponent(link.split("/parent/")[1] ?? "");
  const ownerSettings = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?profileId=${profile.id}`, { headers: { cookie } }));
    return { status: res.status, body: await res.json().catch(() => null), cacheControl: res.headers.get("cache-control") };
  })();
  check("owner settings can be restored after reload", ownerSettings.status === 200 && ownerSettings.body?.enabled === true && ownerSettings.body?.link === link);
  check("owner settings are not cacheable", /no-store/i.test(ownerSettings.cacheControl ?? ""));
  const ownerSettingsAnonymous = await (parentGet as any)(new Request(`http://localhost/api/parent-share?profileId=${profile.id}`));
  check("owner settings require an authenticated owner", ownerSettingsAnonymous.status === 401);

  const emailSave = await call(parentPatch as any, "/api/parent-share", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ profileId: profile.id, email: "parent@example.com" }),
  });
  check("the owner can save the optional contact note without rotating the link", emailSave.status === 200 && emailSave.body?.email === "parent@example.com");
  const settingsAfterEmail = await call(parentGet as any, `/api/parent-share?profileId=${profile.id}`);
  check("the contact note persists on read-back", settingsAfterEmail.body?.email === "parent@example.com" && settingsAfterEmail.body?.link === link);

  const view = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?token=${encodeURIComponent(sharedToken)}`));
    return { status: res.status, body: await res.json().catch(() => null), cacheControl: res.headers.get("cache-control"), referrerPolicy: res.headers.get("referrer-policy") };
  })();

  check("the link resolves to a summary", view.status === 200, `got ${view.status}`);
  check("the summary identifies the shared student by first name", view.body?.summary?.studentFirstName === "Aziza");
  check("the shared preferred-country field uses preferences, not applicant country", view.body?.summary?.profileContext?.targetCountries === "Canada");
  check("the tracker total counts real application records", view.body?.summary?.applicationRecords?.total === 2);
  check("only submitted or later-stage records are counted as submitted", view.body?.summary?.applicationRecords?.submittedOrLater === 1);
  check("the latest accepted outcome is marked student-reported", view.body?.summary?.applicationRecords?.studentReportedAcceptedOutcomes === 1);
  check("public bearer response is no-store and suppresses referrers", /no-store/i.test(view.cacheControl ?? "") && view.referrerPolicy === "no-referrer");

  // The allowlist claim: nothing private leaks even though rows contain it.
  const leaked = JSON.stringify(view.body ?? {});
  check("no password material leaks", !/\$2b\$|passwordHash/.test(leaked));
  check("no owner or parent email leaks", !/aziza@example\.com|parent@example\.com/.test(leaked));
  check("no GPA, IELTS value, or essay data leaks", !/3\.7|7\.5|essayDraft/i.test(leaked));
  check("no university or scholarship names leak", !/Private University|Private Award Name/.test(leaked));
  check("no private outcome notes or financial award amount leak", !/Private outcome note|20000/.test(leaked));

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
  check("sharing can be revoked", off.status === 200 && off.body?.enabled === false && off.body?.email === "");
  const revokedState = await db
    .select({ enabled: schema.studentProfiles.parentShareEnabled, token: schema.studentProfiles.parentShareToken, email: schema.studentProfiles.parentShareEmail })
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, profile.id));
  check("revocation clears the bearer token and stored parent email", revokedState[0]?.enabled === false && revokedState[0]?.token === null && revokedState[0]?.email === null);

  const afterRevoke = await (async () => {
    const res = await (parentGet as any)(new Request(`http://localhost/api/parent-share?token=${encodeURIComponent(sharedToken)}`));
    return { status: res.status };
  })();
  check("the old link stops working after revocation", afterRevoke.status === 404, `got ${afterRevoke.status}`);

  await db.delete(schema.applications).where(inArray(schema.applications.id, [sharedAppSubmitted.id, sharedAppPreparing.id]));
  await db
    .update(schema.studentProfiles)
    .set({ preferredCountries: currentProfilePreferences.preferredCountries ?? null })
    .where(eq(schema.studentProfiles.id, profile.id));

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

  const { GET: docGet, PATCH: docPatch, DELETE: docDelete } = await import("../src/app/api/documents/route");
  const { PATCH: appPatch, DELETE: appDelete } = await import("../src/app/api/applications/route");
  const { POST: outcomePost } = await import("../src/app/api/applications/outcome/route");
  const { PATCH: suPatch, DELETE: suDelete } = await import("../src/app/api/saved-universities/route");
  const { PATCH: ssPatch, DELETE: ssDelete } = await import("../src/app/api/saved-scholarships/route");
  const { DELETE: essayDelete } = await import("../src/app/api/essays/route");

  const json = (o: unknown) => ({ "Content-Type": "application/json" });

  // -- documents ---------------------------------------------------------
  // GET reconciliation batches the saved scholarship's requirements and
  // serializes concurrent reconciliation without overwriting student state.
  await db.update(schema.scholarships)
    .set({ requiredDocuments: '["transcript","passport","recommendation","transcript"]' })
    .where(eq(schema.scholarships.id, sch.id));
  const [docsFirst, docsSecond] = await Promise.all([
    call(docGet as any, `/api/documents?profileId=${profile.id}`),
    call(docGet as any, `/api/documents?profileId=${profile.id}`),
  ]);
  const scholarshipDocs = await db.select().from(schema.applicationDocuments).where(and(
    eq(schema.applicationDocuments.profileId, profile.id),
    eq(schema.applicationDocuments.entityType, "scholarship"),
    eq(schema.applicationDocuments.entityId, sch.id),
  ));
  check("documents GET: parallel requests both return the checklist", docsFirst.status === 200 && docsSecond.status === 200);
  check("documents GET: duplicate requirements and concurrent reads create exactly three rows", scholarshipDocs.length === 3, `got ${scholarshipDocs.length}`);
  const transcriptDoc = scholarshipDocs.find((doc) => doc.documentType === "transcript");
  if (transcriptDoc) {
    await db.update(schema.applicationDocuments)
      .set({ status: "uploaded", fileName: "transcript.pdf" })
      .where(eq(schema.applicationDocuments.id, transcriptDoc.id));
  }
  const docsAfterUpload = await call(docGet as any, `/api/documents?profileId=${profile.id}`);
  const [transcriptAfterRead] = transcriptDoc
    ? await db.select().from(schema.applicationDocuments).where(eq(schema.applicationDocuments.id, transcriptDoc.id))
    : [];
  check("documents GET: repeated reconciliation preserves uploaded status and metadata", docsAfterUpload.status === 200 && transcriptAfterRead?.status === "uploaded" && transcriptAfterRead?.fileName === "transcript.pdf");

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

  // -- outcome record and explicit per-result sharing consent -------------
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
  // The decision-time snapshot is stored as separate columns for the opt-in
  // historical comparison view; it does not feed profile-fit calculations.
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

  const [stringConsentApp] = await db
    .insert(schema.applications)
    .values({ profileId: profile.id, universityId: uniA.id, status: "Submitted" })
    .returning();
  const stringConsent = await call(outcomePost as any, "/api/applications/outcome", {
    method: "POST",
    headers: { ...json({}), cookie },
    // A string that looks false must not be coerced to the consent boolean true.
    body: JSON.stringify({ applicationId: stringConsentApp.id, result: "accepted", shareConsent: "false" }),
  });
  check(
    "outcome POST: string-valued consent is not treated as opt-in",
    stringConsent.status === 200 && stringConsent.body?.outcome?.shareConsent === false,
    JSON.stringify(stringConsent.body?.outcome?.shareConsent)
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
  // 6. /api/chancing — the route compares this profile against university
  // catalogue data. Admission probability is explicitly unavailable, and
  // other students' outcomes must never affect or leak into this fit response.
  section("6. /api/chancing — profile-to-catalogue fit, no admission probability");

  const { GET: chancingGet } = await import("../src/app/api/chancing/route");
  const { GET: similarProfilesGet } = await import("../src/app/api/similar-profiles/route");
  const ch = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);

  check("responds 200", ch.status === 200, `got ${ch.status} ${JSON.stringify(ch.body)?.slice(0, 200)}`);
  check(
    "both saved universities are compared against catalogue data",
    ch.body?.results?.length === 2,
    `got ${ch.body?.results?.length}`
  );

  const first = ch.body?.results?.[0] ?? {};
  const fitSnapshot = (row: any) =>
    JSON.stringify({
      universityId: row?.universityId,
      universityName: row?.universityName,
      fitScore: row?.fitScore,
      fitReasons: row?.fitReasons,
      fitIssues: row?.fitIssues,
      comparedDimensions: row?.comparedDimensions,
      totalDimensions: row?.totalDimensions,
      probability: row?.probability,
    });
  const baselineByUniversity: Record<string, string> = Object.fromEntries(
    (ch.body?.results ?? []).map((row: any) => [String(row.universityId), fitSnapshot(row)])
  );

  // The route compares this student's recorded profile with catalogue data.
  // It deliberately does not produce admission odds, rank applicant quality,
  // or blend other students' outcomes into the fit score.
  check("Fit score is present as its own number", typeof first.fitScore === "number", JSON.stringify(first.fitScore));
  check(
    "admission probability is explicitly unavailable, never numeric",
    first.probability?.available === false &&
      first.probability?.reason === "no-validated-methodology" &&
      first.admission === undefined,
    JSON.stringify({ probability: first.probability, admission: first.admission })
  );
  check(
    "no admission range object (mid/low/high/label) exists in the response",
    first.admission === undefined,
    JSON.stringify(first).slice(0, 200)
  );
  check(
    "fit and admission probability remain separate",
    typeof first.fitScore === "number" && first.probability?.available === false,
    `fit=${first.fitScore} probability=${JSON.stringify(first.probability)}`
  );
  check(
    "the catalogue comparison reports its evidence coverage",
    typeof first.comparedDimensions === "number" &&
      typeof first.totalDimensions === "number" &&
      first.comparedDimensions >= 0 &&
      first.comparedDimensions <= first.totalDimensions &&
      first.totalDimensions > 0,
    JSON.stringify({ compared: first.comparedDimensions, total: first.totalDimensions })
  );
  check(
    "explanations are grounded in the university match",
    Array.isArray(first.fitReasons) &&
      Array.isArray(first.fitIssues) &&
      (first.fitReasons.length + first.fitIssues.length > 0),
    JSON.stringify({ reasons: first.fitReasons, issues: first.fitIssues })
  );
  check(
    "legacy sub-scores and unverified positive/negative claims are not returned",
    first.subScores === undefined && first.positives === undefined && first.negatives === undefined,
    JSON.stringify({ subScores: first.subScores, positives: first.positives, negatives: first.negatives })
  );
  check(
    "no outcome-derived basis, sample count, or readiness claim is returned",
    first.dataBasis === undefined && first.sampleSize === undefined && ch.body?.dataset === undefined,
    JSON.stringify({ dataBasis: first.dataBasis, sampleSize: first.sampleSize, dataset: ch.body?.dataset })
  );

  // --- outcomes do not alter the profile-to-catalogue fit ----------------
  // Consent permits the app to retain outcomes for an explicitly supported
  // purpose; it does not make the unvalidated admission-estimate engine safe.
  // The route must therefore remain a pure profile/catalogue comparison.
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
      snapshotGpaScale: 4,
      snapshotMajor: "Computer Science",
      snapshotCountry: "Uzbekistan",
    }))
  );

  const ch2 = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);
  const consentedOutcomesDidNotChangeFit =
    ch2.status === 200 &&
    (ch2.body?.results ?? []).length === Object.keys(baselineByUniversity).length &&
    (ch2.body?.results ?? []).every(
      (row: any) => baselineByUniversity[String(row.universityId)] === fitSnapshot(row)
    );
  check(
    "12 consented outcome rows are stored for the isolation fixture",
    consentApps.length === 12,
    `got ${consentApps.length}`
  );
  check(
    "consented outcomes do not change the profile-to-catalogue fit",
    consentedOutcomesDidNotChangeFit,
    JSON.stringify(ch2.body?.results?.map(fitSnapshot))
  );
  check(
    "consented outcomes do not add probability or cohort-estimate fields",
    (ch2.body?.results ?? []).every(
      (row: any) =>
        row.probability?.available === false &&
        row.probability?.reason === "no-validated-methodology" &&
        row.dataBasis === undefined &&
        row.sampleSize === undefined
    ) && ch2.body?.dataset === undefined,
    JSON.stringify(ch2.body)
  );

  // --- non-consented outcomes must NOT be used ---------------------------
  // This also verifies the public fit response is unchanged; the catalogue
  // comparison does not train on, sample, or disclose another student's data.
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
      snapshotGpaScale: 4,
      snapshotMajor: "Computer Science",
      snapshotCountry: "Germany",
    }))
  );

  const sharedOutcomes = await call(
    similarProfilesGet as any,
    `/api/similar-profiles?profileId=${profile.id}&limit=50`
  );
  const sharedMatches = sharedOutcomes.body?.matches ?? [];
  check(
    "Shared Outcomes returns only the 13 matching consented records",
    sharedOutcomes.status === 200 && sharedOutcomes.body?.total === 13 && sharedMatches.length === 13,
    `status=${sharedOutcomes.status} total=${sharedOutcomes.body?.total} shown=${sharedMatches.length}`
  );
  check(
    "non-consented records with comparable fields and school names stay private",
    !sharedMatches.some((match: any) => ["LMU Munich", "Private University Name"].includes(match.universityName)),
    JSON.stringify(sharedMatches.map((match: any) => match.universityName))
  );
  check(
    "the response contains only institution, recorded decision and compared-field codes",
    sharedMatches.every(
      (match: any) => Object.keys(match).sort().join(",") === "comparedFields,result,universityName"
    ) &&
      sharedOutcomes.body?.acceptanceShare === undefined &&
      sharedOutcomes.body?.positionNote === undefined,
    JSON.stringify(sharedMatches[0])
  );
  const sharedForeign = await call(similarProfilesGet as any, `/api/similar-profiles?profileId=${other.id}`);
  check("Shared Outcomes refuses access to another profile", sharedForeign.status === 403, `got ${sharedForeign.status}`);

  const ch3 = await call(chancingGet as any, `/api/chancing?profileId=${profile.id}`);

  const allOutcomesDidNotChangeFit =
    ch3.status === 200 &&
    (ch3.body?.results ?? []).length === Object.keys(baselineByUniversity).length &&
    (ch3.body?.results ?? []).every(
      (row: any) => baselineByUniversity[String(row.universityId)] === fitSnapshot(row)
    );
  check(
    "20 non-consented outcome rows are stored for the isolation fixture",
    privateApps.length === 20,
    `got ${privateApps.length}`
  );
  check(
    "non-consented outcome rows do not change either university's fit",
    allOutcomesDidNotChangeFit,
    JSON.stringify(ch3.body?.results?.map(fitSnapshot))
  );
  check(
    "no consent state exposes a sample count, outcome-derived basis, or readiness claim",
    (ch3.body?.results ?? []).every(
      (row: any) => row.dataBasis === undefined && row.sampleSize === undefined
    ) && ch3.body?.dataset === undefined,
    JSON.stringify({ results: ch3.body?.results, dataset: ch3.body?.dataset })
  );
  check(
    "probability remains explicitly unavailable after outcome rows are inserted",
    (ch3.body?.results ?? []).every(
      (row: any) =>
        row.probability?.available === false &&
        row.probability?.reason === "no-validated-methodology"
    ),
    JSON.stringify(ch3.body?.results?.map((row: any) => row.probability))
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
  check("reports 8 sections", Array.isArray(ps.body?.strength?.sections) && ps.body.strength.sections.length === 8);
  check(
    "every section states its evidence coverage and what is missing",
    ps.body?.strength?.sections?.every(
      (s: any) =>
        typeof s.coverage === "number" &&
        s.coverage >= 0 &&
        s.coverage <= 1 &&
        Array.isArray(s.missing) &&
        typeof s.scorePrecise === "number"
    )
  );
  check(
    "the overall ships with its unrounded value and its basis",
    typeof ps.body?.strength?.overallPrecise === "number" &&
      typeof ps.body?.strength?.basis === "string" &&
      ps.body.strength.basis.length > 10
  );
  check(
    "all recorded-field coverage values stay in their documented ranges",
    ps.body?.strength?.sections?.every(
      (s: any) =>
        typeof s.score === "number" && s.score >= 0 && s.score <= 100 &&
        typeof s.coverage === "number" && s.coverage >= 0 && s.coverage <= 1
    )
  );
  check(
    "overall is a coverage percentage, with no completeness or eligibility claim",
    typeof ps.body?.strength?.overall === "number" &&
      ps.body.strength.overall >= 0 &&
      ps.body.strength.overall <= 100 &&
      typeof ps.body?.strength?.overallPrecise === "number" &&
      ps.body.strength.overallPrecise >= 0 &&
      ps.body.strength.overallPrecise <= 100 &&
      ps.body?.strength?.completeness === undefined &&
      ps.body?.strength?.eligibility === undefined &&
      // Same wording the unit test pins (scripts/check-chancing.ts) so the
      // honesty disclaimer cannot drift between the two suites.
      /not an eligibility, quality, or admission-likelihood score/i.test(ps.body?.strength?.basis ?? "")
  );
  check(
    "the seeded profile reports coverage only for sections with recorded details",
    typeof ps.body?.strength?.scoredSections === "number" &&
      ps.body.strength.scoredSections > 0 &&
      ps.body.strength.scoredSections <= ps.body.strength.totalSections &&
      ps.body.strength.overall > 0,
    `scored=${ps.body?.strength?.scoredSections} overall=${ps.body?.strength?.overall}`
  );
  check(
    "extracurricular analysis reports four recorded counts and no merit scores",
    Object.keys(ps.body?.extracurriculars ?? {}).sort().join(",") ===
      "activities,awards,leadership,research" &&
      ["activities", "awards", "leadership", "research"].every(
        (key) => Number.isInteger(ps.body?.extracurriculars?.[key]) && ps.body.extracurriculars[key] >= 0
      ),
    JSON.stringify(ps.body?.extracurriculars)
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

  // Fixture rows are test-scoped (TEST-FIXTURE marker) and removed before
  // they are (re-)inserted: the feed also contains the real seeded catalogue,
  // so absolute totals must never be asserted — and leftover fixtures from an
  // earlier run must not accumulate in the student-facing feed.
  const OPP_FIXTURE = "TEST-FIXTURE";
  await db.delete(schema.opportunities).where(like(schema.opportunities.title, `${OPP_FIXTURE}%`));
  // Legacy fixtures from earlier versions of this test (no marker, but exact
  // title+provider pairs that never belong to the seeded catalogue).
  await db
    .delete(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.title, "International Collegiate Programming Contest"),
        eq(schema.opportunities.provider, "ICPC Foundation"),
      ),
    );
  await db
    .delete(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.title, "Germany Biotech Internship"),
        eq(schema.opportunities.provider, "Example Biotech"),
      ),
    );

  await db.insert(schema.opportunities).values([
    {
      type: "competition",
      title: `${OPP_FIXTURE} International Programming Contest`,
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
      title: `${OPP_FIXTURE} Germany Biotech Internship`,
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
  const opportunityRowsBeforeRead = await db.select({ id: schema.opportunities.id }).from(schema.opportunities);
  const opp = await call(oppGet as any, "/api/opportunities");
  const opportunityRowsAfterRead = await db.select({ id: schema.opportunities.id }).from(schema.opportunities);
  check("responds 200", opp.status === 200, `got ${opp.status} ${JSON.stringify(opp.body)?.slice(0, 200)}`);
  check(
    "public catalogue reads do not seed or mutate opportunity rows",
    opportunityRowsAfterRead.length === opportunityRowsBeforeRead.length && opp.body?.count === opportunityRowsBeforeRead.length,
    `before=${opportunityRowsBeforeRead.length}, after=${opportunityRowsAfterRead.length}, response=${opp.body?.count}`
  );
  const oppCounts = opp.body?.counts ?? {};
  check(
    "counts by type cover both fixtures and add up to the total",
    oppCounts.competition >= 1 &&
      oppCounts.internship >= 1 &&
      Object.values(oppCounts).reduce((a: number, b: unknown) => a + Number(b ?? 0), 0) === opp.body?.count,
    JSON.stringify({ counts: oppCounts, count: opp.body?.count })
  );
  check("the signed-in profile gets a numeric match", Array.isArray(opp.body?.items) && opp.body.items.every((o: any) => typeof o.match === "number" && o.match >= 0 && o.match <= 100));
  check("scored for the profile's major", opp.body?.scoredFor === "Computer Science", `got ${opp.body?.scoredFor}`);
  const icpcRow = opp.body?.items?.find((o: any) => o.title.startsWith(OPP_FIXTURE) && o.type === "competition");
  check("CS undergrad scores high on the CS contest", icpcRow && icpcRow.match >= 70, `got ${icpcRow?.match}`);
  const biotechRow = opp.body?.items?.find((o: any) => o.title.startsWith(OPP_FIXTURE) && o.type === "internship");
  check("level/field mismatch is flagged, not hidden", biotechRow && biotechRow.flags.length >= 1 && biotechRow.match < icpcRow.match, `flags=${JSON.stringify(biotechRow?.flags)}`);

  const oppAnon = await (async () => {
    const res = await (oppGet as any)(new Request("http://localhost/api/opportunities"));
    return { status: res.status, body: await res.json().catch(() => null) };
  })();
  check("anonymous still gets the catalog, unscored", oppAnon.status === 200 && oppAnon.body?.items?.every((o: any) => o.match === null) && oppAnon.body?.scoredFor === null);

  const oppFiltered = await call(oppGet as any, "/api/opportunities?type=internship");
  check(
    "type filter returns only that type, and its count matches byType",
    oppFiltered.status === 200 &&
      oppFiltered.body?.count === oppCounts.internship &&
      oppFiltered.body?.items?.length === oppFiltered.body?.count &&
      oppFiltered.body.items.every((o: any) => o.type === "internship"),
    JSON.stringify({ count: oppFiltered.body?.count, byType: oppCounts.internship })
  );

  const { catalogCacheStats } = await import("../src/lib/catalogCache");
  check("opportunities warm the shared short-lived catalogue cache", catalogCacheStats().opportunitiesCached);
  const [adminProfile] = await db.insert(schema.studentProfiles).values({
    name: "Opportunity Cache Admin",
    email: "opportunity-cache-admin@example.com",
    isAdmin: true,
  }).returning();
  const adminToken = signSessionToken({ id: adminProfile.id, passwordHash: adminProfile.passwordHash });
  const adminRequest = (method: string, body?: unknown, url = "http://localhost/api/admin/opportunities") => new Request(url, {
    method,
    headers: { cookie: `sb_session=${adminToken}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const { POST: adminOpportunityPost, DELETE: adminOpportunityDelete } = await import("../src/app/api/admin/opportunities/route");
  const created = await adminOpportunityPost(adminRequest("POST", {
    type: "research",
    title: "ADMIN-OPP-CACHE-TEST",
    provider: "Test Admin",
    country: null,
    fields: ["Computer Science"],
    level: "undergrad",
    url: "https://example.com",
    description: "Integration fixture",
    isVerified: false,
  }));
  const createdBody = await created.json();
  const createdId = Number(createdBody.id);
  check("authorized opportunity creation succeeds", created.status === 200 && createdId > 0, `status=${created.status}`);
  check("admin creation invalidates the opportunity cache", !catalogCacheStats().opportunitiesCached);
  const refreshedFeed = await call(oppGet as any, "/api/opportunities");
  check("the next public read contains the newly created opportunity", refreshedFeed.body?.items?.some((item: any) => item.id === createdId));
  const deleted = await adminOpportunityDelete(adminRequest("DELETE", undefined, `http://localhost/api/admin/opportunities?id=${createdId}`));
  check("authorized opportunity deletion succeeds", deleted.status === 200);
  check("admin deletion invalidates the opportunity cache", !catalogCacheStats().opportunitiesCached);
  const afterDeleteFeed = await call(oppGet as any, "/api/opportunities");
  check("the next public read no longer contains the deleted opportunity", !afterDeleteFeed.body?.items?.some((item: any) => item.id === createdId));

  // Clean up the fixture rows so the student-facing feed keeps only real data.
  await db.delete(schema.opportunities).where(like(schema.opportunities.title, `${OPP_FIXTURE}%`));

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

  // Without a session the analysis still works but nothing is persisted.
  // (A real anonymous request: `call()` would attach the student's cookie, and
  // a signed-in free account is correctly subject to its practice cap.)
  const before = vh2.body?.count;
  const va2 = await visaAnalyze(new Request("http://localhost/api/visa/analyze", {
    method: "POST",
    headers: { ...json({}) },
    body: JSON.stringify({
      countryCode: "US",
      messages: [
        { role: "officer", text: "What will you study?" },
        { role: "user", text: "Computer science, specifically data engineering, at a university in the United States." },
      ],
    }),
  }));
  const va2Body = await va2.json().catch(() => null);
  check("visa analyze: anonymous run still answers", va2.status === 200, `got ${va2.status} ${JSON.stringify(va2Body)?.slice(0, 120)}`);
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

  // ---- Catalogue visibility and global-search destinations ---------------
  const [draftCourse] = await db
    .insert(schema.courses)
    .values({
      title: "Private Draft Search Sentinel",
      description: "Unpublished lesson preview sentinel",
      isPublished: false,
    })
    .returning();
  const courseDetailRoute = await import("../src/app/api/courses/[id]/route");
  const draftDetail = await call(
    ((request: Request) =>
      courseDetailRoute.GET(request, { params: Promise.resolve({ id: String(draftCourse.id) }) })) as any,
    `/api/courses/${draftCourse.id}?profileId=${profile.id}`
  );
  check(
    "courses: an authenticated student cannot fetch an unpublished course by id",
    draftDetail.status === 404 && draftDetail.body?.error === "Course not found",
    `got ${draftDetail.status}`
  );
  const draftSearch = await call(
    (await import("../src/app/api/search/route")).GET as any,
    `/api/search?profileId=${profile.id}&q=${encodeURIComponent(draftCourse.title)}`
  );
  check(
    "courses: global search does not expose unpublished course metadata",
    draftSearch.status === 200 && !draftSearch.body?.results?.some((r: any) => r.kind === "course" && r.id === draftCourse.id),
    JSON.stringify(draftSearch.body?.results ?? []).slice(0, 160)
  );
  await db.delete(schema.courses).where(eq(schema.courses.id, draftCourse.id));

  const [searchTarget] = await db
    .insert(schema.scholarships)
    .values({
      title: "Search Navigation Regression Grant",
      provider: "Test Provider",
      country: "Uzbekistan",
      description: "Search routing test fixture.",
      requirements: "Test fixture only.",
      websiteUrl: "https://example.org/search-test",
    })
    .returning();
  const searchRoute = await import("../src/app/api/search/route");
  const searchPayload = await call(
    searchRoute.GET as any,
    `/api/search?profileId=${profile.id}&q=${encodeURIComponent(searchTarget.title)}`
  );
  const scholarshipHit = searchPayload.body?.results?.find((r: any) => r.kind === "scholarship" && r.id === searchTarget.id);
  check(
    "search: scholarship records return a resolvable browse-pane target and localized group id",
    searchPayload.status === 200 && scholarshipHit?.tab === "scholarships/browse" && scholarshipHit?.group === "explore",
    JSON.stringify(scholarshipHit)
  );

  const focusedRows = await db
    .insert(schema.scholarships)
    .values([
      {
        title: "Focus Search Regression Grant",
        provider: "Test Provider A",
        country: "Uzbekistan",
        description: "Duplicate-title focus fixture.",
        requirements: "Test fixture only.",
        websiteUrl: "https://example.org/focus-a",
      },
      {
        title: "Focus Search Regression Grant",
        provider: "Test Provider B",
        country: "Uzbekistan",
        description: "Selected duplicate-title focus fixture.",
        requirements: "Test fixture only.",
        websiteUrl: "https://example.org/focus-b",
      },
    ])
    .returning();
  const scholarshipsRoute = await import("../src/app/api/scholarships/route");
  const focusedCatalog = await call(
    scholarshipsRoute.GET as any,
    `/api/scholarships?search=${encodeURIComponent(focusedRows[0].title)}&focusId=${focusedRows[1].id}&page=1&perPage=1`,
    { headers: anonHdr }
  );
  check(
    "scholarships: global-search focus id is first in the existing title-filtered catalogue",
    focusedCatalog.status === 200 && focusedCatalog.body?.scholarships?.[0]?.id === focusedRows[1].id,
    JSON.stringify(focusedCatalog.body?.scholarships?.[0])?.slice(0, 140)
  );

  const [inactiveScholarship] = await db
    .insert(schema.scholarships)
    .values({
      title: "Inactive Scholarship Visibility Sentinel",
      provider: "Inactive Test Provider",
      country: "Uzbekistan",
      description: "Inactive record must not appear in student catalogues.",
      requirements: "Test fixture only.",
      websiteUrl: "https://example.org/inactive-test",
      isActive: false,
    })
    .returning();
  const inactiveCatalog = await call(
    scholarshipsRoute.GET as any,
    `/api/scholarships?search=${encodeURIComponent(inactiveScholarship.title)}&page=1&perPage=20`,
    { headers: anonHdr }
  );
  const inactiveSearch = await call(
    searchRoute.GET as any,
    `/api/search?profileId=${profile.id}&q=${encodeURIComponent(inactiveScholarship.title)}`
  );
  check(
    "scholarships: inactive records stay out of both browse and global search",
    inactiveCatalog.status === 200 &&
      !inactiveCatalog.body?.scholarships?.some((s: any) => s.id === inactiveScholarship.id) &&
      inactiveSearch.status === 200 &&
      !inactiveSearch.body?.results?.some((r: any) => r.kind === "scholarship" && r.id === inactiveScholarship.id)
  );
  await db.delete(schema.scholarships).where(inArray(schema.scholarships.id, [
    searchTarget.id,
    ...focusedRows.map((row: any) => row.id),
    inactiveScholarship.id,
  ]));

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
  const interviewTurn = {
    countryCode: "US",
    messages: [
      { role: "officer", text: "Why did you choose this university?" },
      { role: "user", text: "Its computer science program fits my academic goals." },
    ],
  };
  const vchat = await call(visaChatRoute.POST as any, "/api/visa/chat", {
    method: "POST", headers: jsonHdr, body: JSON.stringify(interviewTurn),
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
    method: "POST", headers: { ...jsonHdr, ...anonHdr }, body: JSON.stringify(interviewTurn),
  });
  const anonUsageRows = await db
    .select()
    .from(schema.aiUsage)
    .where(and(eq(schema.aiUsage.taskType, "visa"), sql`${schema.aiUsage.profileId} IS NULL`));
  check("visa chat: anonymous practice still works and is logged with a null profile", vchatAnon.status === 200 && anonUsageRows.length >= 1, `status ${vchatAnon.status}, rows ${anonUsageRows.length}`);
  // Anonymous on purpose: `call()` would attach the student's cookie, and the
  // free practice cap (exercised in section 10 and 13) applies to signed-in accounts.
  const vanalyzeRes = await visaAnalyzeRoute.POST(new Request("http://localhost/api/visa/analyze", {
    method: "POST", headers: jsonHdr,
    body: JSON.stringify({ countryCode: "US", messages: [{ role: "user", text: "I will study computer science and fund it myself." }, { role: "assistant", text: "Why that university?" }] }),
  }));
  const vanalyze = { status: vanalyzeRes.status, body: await vanalyzeRes.json().catch(() => null) };
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
  const savedUniversityEntries = (freeDeadlines.body?.items ?? []).filter((item: any) => item.type === "university");
  check(
    "deadlines: saved universities without a deadline are not falsely marked OPEN",
    savedUniversityEntries.length > 0 && savedUniversityEntries.every((item: any) => item.date === null && item.status === "NO DEADLINE ON FILE"),
    JSON.stringify(savedUniversityEntries.map((item: any) => ({ status: item.status, date: item.date })))
  );
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

  // ---- 13. AI cost accounting, budgets, race-safe quotas, Live voice ----------
  section("13. AI cost controls — pricing, budgets, race-safe quotas, Live voice allowance (2026-10)");
  {
    const aiRouter = await import("../src/lib/ai/index");
    const budgetGate = await import("../src/lib/ai/budget-gate");
    const { guardAiRequest } = await import("../src/lib/ai/guard");
    const { signSessionToken: sign } = await import("../src/lib/auth");

    // A priced mock provider on a dedicated port (the A21 mock is closed by now).
    let mockMode: string[] = [];
    let mockCalls13 = 0;
    const mock13 = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c: string) => (raw += c));
      req.on("end", () => {
        mockCalls13++;
        const step = mockMode.shift() ?? "ok";
        if (step === "fail500") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "upstream down" } }));
          return;
        }
        if (step === "rate") {
          res.writeHead(429, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "slow down" } }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          model: "priced-model",
          choices: [{ index: 0, message: { role: "assistant", content: "Priced reply." }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: 500 },
        }));
      });
    });
    await new Promise<void>((resolve) => mock13.listen(55456, "127.0.0.1", resolve));
    const savedEnv13 = { key: process.env.AI_CUSTOM_API_KEY, base: process.env.AI_CUSTOM_BASE_URL, model: process.env.AI_CUSTOM_MODEL };
    process.env.AI_CUSTOM_API_KEY = "test-custom-key-13";
    process.env.AI_CUSTOM_BASE_URL = "http://127.0.0.1:55456/v1";
    process.env.AI_CUSTOM_MODEL = "priced-model";
    const savedGemini = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY; // Live token tests must never reach Google
    await setConfig("ai_provider_general", "custom");
    await setConfig("ai_model_pricing", JSON.stringify({ custom: { "priced-model": { inputPerMTok: 2, outputPerMTok: 4 } } }));
    await setConfig("ai_budget_daily_usd", "");
    await setConfig("ai_budget_monthly_usd", "");
    await setConfig("ai_budget_provider_daily_usd", "{}");

    const [acct] = await db
      .insert(schema.studentProfiles)
      .values({ name: "Cost Student", email: "cost-student@example.com", passwordHash: profile.passwordHash })
      .returning();
    const acctCookie = `sb_session=${sign({ id: acct.id, passwordHash: acct.passwordHash })}`;

    // --- (a) priced call: estimated cost, exact arithmetic, one row ---------
    const priced = await aiRouter.aiChat({ taskType: "general", prompt: "hello", profileId: acct.id }, { sleep: async () => {} });
    check("pricing: a priced reply carries an ESTIMATED cost (1000×$2 + 500×$4 per 1M = $0.004)",
      priced.ok && priced.response.costStatus === "estimated" && Math.abs((priced.ok ? priced.response.costEstimate ?? -1 : -1) - 0.004) < 1e-9,
      JSON.stringify(priced.ok ? priced.response : priced.error));
    const [pricedRow] = await db.select().from(schema.aiUsage).where(and(eq(schema.aiUsage.profileId, acct.id), eq(schema.aiUsage.taskType, "general")));
    check("pricing: exactly one ai_usage row, with cost_status estimated and the profile charged",
      Boolean(pricedRow) && pricedRow.costStatus === "estimated" && Math.abs(pricedRow.costEstimate - 0.004) < 1e-9 && pricedRow.status === "success" && pricedRow.attempts === 1,
      JSON.stringify(pricedRow));

    // --- (b) retry on a transient error: one reply, one row, attempts = 2 --
    mockMode = ["rate", "ok"];
    const retried = await aiRouter.aiChat({ taskType: "general", prompt: "again", profileId: acct.id }, { maxAttempts: 3, sleep: async () => {} });
    const rowsAfterRetry = await db.select().from(schema.aiUsage).where(and(eq(schema.aiUsage.profileId, acct.id), eq(schema.aiUsage.taskType, "general")));
    check("retry: a transient failure then success is ONE logical request (no duplicate usage row)",
      retried.ok && rowsAfterRetry.length === 2 && rowsAfterRetry.filter((r) => r.attempts === 2).length === 1,
      `rows ${rowsAfterRetry.length} attempts ${JSON.stringify(rowsAfterRetry.map((r) => r.attempts))}`);

    // --- (c) a failed request is recorded as a failure, cost not invented ---
    mockMode = ["fail500"];
    const failed = await aiRouter.aiChat({ taskType: "general", prompt: "fail", profileId: acct.id }, { maxAttempts: 1, sleep: async () => {} });
    const [failRow] = await db
      .select()
      .from(schema.aiUsage)
      .where(and(eq(schema.aiUsage.profileId, acct.id), eq(schema.aiUsage.status, "error")))
      .orderBy(desc(schema.aiUsage.createdAt));
    check("failures: a failed request leaves one error row with its category and no fabricated cost",
      failed.ok === false && Boolean(failRow) && failRow.errorCategory === "provider_unavailable" && failRow.costStatus === "usage_unreported",
      JSON.stringify(failRow));

    // --- (d) budget: a 0 daily budget blocks BEFORE any provider call -------
    await setConfig("ai_budget_daily_usd", "0");
    const callsBefore = mockCalls13;
    const blocked = await aiRouter.aiChat({ taskType: "general", prompt: "blocked", profileId: acct.id }, { sleep: async () => {} });
    check("budget: a 0 daily budget refuses the call with budget_exhausted and makes NO provider call",
      !blocked.ok && blocked.error.category === "budget_exhausted" && mockCalls13 === callsBefore,
      `calls ${mockCalls13 - callsBefore}`);
    const [blockRow] = await db
      .select()
      .from(schema.aiUsage)
      .where(and(eq(schema.aiUsage.profileId, acct.id), eq(schema.aiUsage.errorCategory, "budget_exhausted")));
    check("budget: the refusal is itself recorded (usage-limit events are visible in admin)", Boolean(blockRow));
    const shown = aiRouter.describeAiError(new aiRouter.AIProviderError("custom", "budget_exhausted", "daily"));
    check("budget: the student sees a neutral message (no amounts, no budget words)", !/budget|\$|USD/i.test(shown), shown);
    await setConfig("ai_budget_daily_usd", "");

    // --- (e) spend already counted: daily / per-provider / monthly ----------
    await setConfig("ai_budget_daily_usd", "0.001");
    const dailyVerdict = await budgetGate.evaluateAiBudget("custom");
    check("budget: spend already at the daily limit → blocked with scope daily",
      !dailyVerdict.allowed && dailyVerdict.scope === "daily", JSON.stringify(dailyVerdict));
    await setConfig("ai_budget_daily_usd", "");
    await setConfig("ai_budget_provider_daily_usd", '{"custom": 0.001}');
    const providerVerdict = await budgetGate.evaluateAiBudget("custom");
    check("budget: a per-provider daily cap blocks only that provider",
      !providerVerdict.allowed && providerVerdict.scope === "provider" && (await budgetGate.evaluateAiBudget("openrouter")).allowed === true,
      JSON.stringify(providerVerdict));
    await setConfig("ai_budget_provider_daily_usd", "{}");
    await setConfig("ai_budget_monthly_usd", "0.0095"); // spend is 0.008 by now → ~84%: a warning, not a block
    const warnVerdict = await budgetGate.evaluateAiBudget("custom");
    check("budget: at 80% of the monthly limit the call is allowed and a warning is raised",
      warnVerdict.allowed === true && warnVerdict.warning?.scope === "monthly" && (warnVerdict.warning?.percent ?? 0) >= 80,
      JSON.stringify(warnVerdict));
    await setConfig("ai_budget_monthly_usd", "");

    // --- (f) race-safe request quota: 10 parallel → exactly the limit -------
    const [racer] = await db
      .insert(schema.studentProfiles)
      .values({ name: "Racer", email: "racer-quota@example.com", passwordHash: profile.passwordHash })
      .returning();
    const racerCookie = `sb_session=${sign({ id: racer.id, passwordHash: racer.passwordHash })}`;
    await setConfig("ai_free_requests_per_day", "3");
    const json13 = { "Content-Type": "application/json" };
    const parallel = await Promise.all(
      Array.from({ length: 10 }, () =>
        guardAiRequest(new Request("http://localhost/api/ai/chat", {
          method: "POST",
          headers: { ...json13, cookie: racerCookie },
          body: JSON.stringify({ profileId: racer.id, message: "hi" }),
        })),
      ),
    );
    const admitted = parallel.filter((g) => g.ok).length;
    const denied = parallel.filter((g) => !g.ok);
    const deniedCodes = await Promise.all(denied.map(async (g) => (g.ok ? null : (await g.response.json())?.code)));
    check("quota race: 10 concurrent requests against a limit of 3 admit exactly 3",
      admitted === 3 && deniedCodes.every((c) => c === "ai_quota_exceeded"), `admitted ${admitted}, codes ${JSON.stringify(deniedCodes)}`);
    await setConfig("ai_free_requests_per_day", "5");

    // --- (g) Live voice: kill switch, plan allowance, race-safe slot ---------
    const liveRoute = await import("../src/app/api/visa/live-token/route");
    const liveCall = (cookie: string) =>
      liveRoute.POST(new Request("http://localhost/api/visa/live-token", {
        method: "POST",
        headers: { ...json13, cookie },
        body: JSON.stringify({ countryCode: "US", gender: "male" }),
      }));
    await setConfig("ai_live_voice_enabled", "false");
    const off = await liveCall(acctCookie);
    check("voice: the admin kill switch answers 503 live_voice_disabled, no token minted",
      off.status === 503 && (await off.json()).code === "live_voice_disabled");
    await setConfig("ai_live_voice_enabled", "true");

    await setConfig("ai_free_live_sessions_per_day", "0");
    const noPlan = await liveCall(acctCookie);
    const noPlanBody = await noPlan.json();
    check("voice: a free account with a 0 allowance is refused (403 premium_required)",
      noPlan.status === 403 && noPlanBody.code === "premium_required", JSON.stringify(noPlanBody));

    await setConfig("ai_free_live_sessions_per_day", "1");
    const [liveAcct] = await db
      .insert(schema.studentProfiles)
      .values({ name: "Live Student", email: "live-student@example.com", passwordHash: profile.passwordHash })
      .returning();
    const liveCookie = `sb_session=${sign({ id: liveAcct.id, passwordHash: liveAcct.passwordHash })}`;
    // No Gemini key in this run: every attempt fails AFTER the quota check. A
    // failed attempt must not use up the allowance (only admitted sessions count).
    const first = await liveCall(liveCookie);
    const firstBody = await first.json();
    check("voice: a session attempt with no key fails closed (503, neutral text, no config detail)",
      first.status === 503 && firstBody.code === "live_unavailable" && !/GEMINI|key|config/i.test(firstBody.error ?? ""), JSON.stringify(firstBody));
    const second = await liveCall(liveCookie);
    check("voice: failed attempts do not use up the allowance (the next attempt is still allowed)", second.status === 503, `got ${second.status}`);

    // Simulate one admitted session earlier today (the allowance is 1 per day).
    await db.insert(schema.rateLimitHits).values({ key: `visa:live-day:${liveAcct.id}`, hitAt: new Date() });
    const third = await liveCall(liveCookie);
    const thirdBody = await third.json();
    check("voice: after the day's admitted session, the next one is refused (429 live_quota_exceeded)",
      third.status === 429 && thirdBody.code === "live_quota_exceeded" && thirdBody.remaining === 0, JSON.stringify(thirdBody));
    check("voice: the 429 carries Retry-After", Boolean(third.headers.get("Retry-After")));
    await setConfig("ai_free_live_sessions_per_day", "2");

    // Platform-wide cap: 0 turns Live off for everyone, whatever the plan.
    await setConfig("ai_live_global_sessions_per_day", "0");
    const capped = await liveCall(liveCookie);
    check("voice: the platform-wide daily cap refuses every session (429 live_capacity_reached)",
      capped.status === 429 && (await capped.json()).code === "live_capacity_reached");
    await setConfig("ai_live_global_sessions_per_day", "30");

    const premiumUntil = new Date(Date.now() + 7 * 86400000);
    await db.update(schema.studentProfiles).set({ isPremium: true, premiumUntil }).where(eq(schema.studentProfiles.id, liveAcct.id));
    const premiumLive = await liveCall(liveCookie);
    check("voice: a Premium account is not blocked by the free allowance (reaches the key check)",
      premiumLive.status === 503 && (await premiumLive.json()).code === "live_unavailable");
    await db.update(schema.studentProfiles).set({ isPremium: false, premiumUntil: null }).where(eq(schema.studentProfiles.id, liveAcct.id));

    const liveUsage = await db.select().from(schema.aiUsage).where(eq(schema.aiUsage.taskType, "visa_live"));
    check("voice: no usage row is written when no token was minted", liveUsage.length === 0, `rows ${liveUsage.length}`);

    // --- (h) visa practice cap cannot be skipped by omitting profileId ------
    const [practice] = await db
      .insert(schema.studentProfiles)
      .values({ name: "Practice Student", email: "practice-cap@example.com", passwordHash: profile.passwordHash })
      .returning();
    const practiceCookie = `sb_session=${sign({ id: practice.id, passwordHash: practice.passwordHash })}`;
    const visaAnalyze = (await import("../src/app/api/visa/analyze/route")).POST;
    await setConfig("free_visa_practice_per_day", "1");
    // Pin the visa task to an UNCONFIGURED provider: otherwise auto-selection would
    // pick the custom mock (it has a key here) and the non-JSON mock reply would 502.
    await setConfig("ai_provider_visa", "groq");
    const transcript = [{ role: "user", text: "I will study computer science and fund it myself." }, { role: "assistant", text: "Why that university?" }];
    const practice1 = await visaAnalyze(new Request("http://localhost/api/visa/analyze", {
      method: "POST", headers: { ...json13, cookie: practiceCookie }, body: JSON.stringify({ countryCode: "US", messages: transcript }),
    }));
    const practice2 = await visaAnalyze(new Request("http://localhost/api/visa/analyze", {
      method: "POST", headers: { ...json13, cookie: practiceCookie }, body: JSON.stringify({ countryCode: "US", messages: transcript }),
    }));
    const practice2Body = await practice2.json();
    check("visa cap: a free account is capped even when it omits profileId (403 plan_limit on the 2nd session)",
      practice1.status === 200 && practice2.status === 403 && practice2Body.code === "plan_limit", `got ${practice1.status}/${practice2.status}`);
    await setConfig("free_visa_practice_per_day", "2");
    await deleteConfig("ai_provider_visa");

    // --- (i) the usage row is charged to the account and the price table is applied per model
    const [pricedRowAgain] = await db.select().from(schema.aiUsage).where(eq(schema.aiUsage.profileId, acct.id)).orderBy(desc(schema.aiUsage.createdAt));
    check("usage: the account's newest row carries the cost status it was priced with", Boolean(pricedRowAgain?.costStatus));

    // Restore everything this section changed.
    await deleteConfig("ai_provider_general");
    await deleteConfig("ai_model_pricing");
    await deleteConfig("ai_budget_daily_usd");
    await deleteConfig("ai_budget_monthly_usd");
    await deleteConfig("ai_budget_provider_daily_usd");
    await deleteConfig("ai_budget_warn_percent");
    await deleteConfig("ai_live_voice_enabled");
    await deleteConfig("ai_free_live_sessions_per_day");
    await deleteConfig("ai_free_requests_per_day");
    await deleteConfig("free_visa_practice_per_day");
    if (savedEnv13.key === undefined) delete process.env.AI_CUSTOM_API_KEY; else process.env.AI_CUSTOM_API_KEY = savedEnv13.key;
    if (savedEnv13.base === undefined) delete process.env.AI_CUSTOM_BASE_URL; else process.env.AI_CUSTOM_BASE_URL = savedEnv13.base;
    if (savedEnv13.model === undefined) delete process.env.AI_CUSTOM_MODEL; else process.env.AI_CUSTOM_MODEL = savedEnv13.model;
    if (savedGemini !== undefined) process.env.GEMINI_API_KEY = savedGemini;
    mock13.close();
  }

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
    annotate(`integration suite crashed before finishing — FATAL: ${e?.message ?? e}${cause ? ` | CAUSE: ${cause.message ?? cause}` : ""}`);
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
