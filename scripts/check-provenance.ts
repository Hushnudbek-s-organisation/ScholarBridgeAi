/**
 * check-provenance.ts — provenance verification for the university detail API.
 *
 * What it proves (deterministically):
 *   1. The API exposes per-program / per-requirement / per-cycle provenance
 *      straight from the DB (source URL, last-verified, verification status,
 *      program→source links with type/official/last-checked).
 *   2. unknown ≠ verified: a program/cycle with NO source and
 *      verification_status 'unverified' comes back as unverified/estimated —
 *      never as verified.
 *   3. stale data is exposed: the pure isStaleVerified() helper labels
 *      verified data older than 180 days as possibly outdated (unit-tested
 *      with fixed dates).
 *   4. no silent mock fallback: the API never invents a source — every
 *      non-null provenance value asserted here must equal a fixture value
 *      we inserted ourselves.
 *
 * Safety:
 *   - Runs against the LOCAL dev DB from DATABASE_URL only.
 *   - All fixture rows carry the marker "PROV-FIXTURE:" / provfixture.example
 *     and are deleted on entry AND on exit (self-cleaning, repeatable).
 *   - Needs the dev server (default http://127.0.0.1:3000, override with
 *     PROVENANCE_APP_URL).
 *
 * Usage: npm run test:provenance
 */
import pg from "pg";
import "./lib/env";
import { isStaleVerified } from "../src/lib/provenance";

const APP_URL = process.env.PROVENANCE_APP_URL || "http://127.0.0.1:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const MARKER = "PROV-FIXTURE:";
const FIX_DOMAIN_PREFIX = "https://provfixture.example/";
const NOW = new Date("2026-10-01T00:00:00Z"); // fixed clock for stale unit tests

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ""}`);
  }
}

/** Delete any leftover fixture rows from a previous (possibly crashed) run. */
async function cleanFixtures() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const unis = await client.query<{ id: number }>(
      "SELECT id FROM universities WHERE name LIKE $1", [`${MARKER}%`]
    );
    const prog = await client.query<{ id: number }>(
      "SELECT p.id FROM programs p JOIN universities u ON u.id = p.university_id WHERE u.name LIKE $1",
      [`${MARKER}%`]
    );
    const uniIds = unis.rows.map((r) => r.id);
    const progIds = prog.rows.map((r) => r.id);
    if (progIds.length) {
      await client.query("DELETE FROM program_requirements WHERE program_id = ANY($1)", [progIds]);
      await client.query("DELETE FROM application_cycles WHERE program_id = ANY($1) OR university_id = ANY($2)", [progIds, uniIds]);
      await client.query("DELETE FROM program_sources WHERE program_id = ANY($1)", [progIds]);
    }
    if (uniIds.length) {
      await client.query("DELETE FROM university_sources WHERE university_id = ANY($1)", [uniIds]);
      await client.query("DELETE FROM programs WHERE university_id = ANY($1)", [uniIds]);
      await client.query("DELETE FROM universities WHERE id = ANY($1)", [uniIds]);
    }
    const srcs = await client.query<{ id: number }>(
      "SELECT id FROM sources WHERE url LIKE $1", [`${FIX_DOMAIN_PREFIX}%`]
    );
    if (srcs.rows.length) {
      const ids = srcs.rows.map((r) => r.id);
      await client.query("DELETE FROM program_sources WHERE source_id = ANY($1)", [ids]);
      await client.query("DELETE FROM university_sources WHERE source_id = ANY($1)", [ids]);
      await client.query("DELETE FROM sources WHERE id = ANY($1)", [ids]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function seedFixtures(): Promise<{ uniId: number; p1: number; p2: number; s1: string; s2: string }> {
  const r = await pool.query(
    `INSERT INTO sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
     VALUES
       ($1, $2, 'provfixture.example', 'official', '2026-09-15 12:00:00', true,  true),
       ($3, $4, 'aggreg.provfixture.example', 'third_party', '2025-11-01 08:00:00', false, false)
     RETURNING id, url`,
    [
      `${FIX_DOMAIN_PREFIX}bsc-cs`,
      `${MARKER} BSc Computer Science page`,
      `${FIX_DOMAIN_PREFIX}aggregator-listing`,
      `${MARKER} Aggregator listing`,
    ]
  );
  const s1 = r.rows[0];
  const s2 = r.rows[1];

  const u = await pool.query(
    `INSERT INTO universities (name, country, city, flag_emoji, description, website_url,
                               official_website_url, verification_status)
     VALUES ($1, 'Testland', 'Testville', '🧪', 'Deterministic provenance test fixture (NOT a real university).', $2, $2, 'unverified')
     RETURNING id`,
    [`${MARKER} Test University`, `${FIX_DOMAIN_PREFIX}home`]
  );
  const uniId: number = u.rows[0].id;

  const p1r = await pool.query(
    `INSERT INTO programs (university_id, name, field, degree_level, duration, duration_unit, study_mode, language,
                           annual_tuition, tuition_currency, tuition_period, description,
                           is_verified, source_url, last_verified_at, verification_status, official_url)
     VALUES ($1, $2, 'Engineering', 'Bachelor', 4, 'years', 'Full-time', 'English',
             5000, 'USD', 'year', 'Fixture program with a verified official source.',
             true, $3, '2026-09-15 12:00:00', 'verified', $3)
     RETURNING id`,
    [uniId, `${MARKER} BSc Computer Science`, s1.url]
  );
  const p2r = await pool.query(
    `INSERT INTO programs (university_id, name, field, degree_level, duration, duration_unit, study_mode, language,
                           annual_tuition, tuition_currency, tuition_period, description,
                           is_verified, source_url, last_verified_at, verification_status, official_url)
     VALUES ($1, $2, 'Science', 'Bachelor', 4, 'years', 'Full-time', 'English',
             NULL, 'USD', 'year', 'Fixture program with NO source — must stay unverified.',
             false, NULL, NULL, 'unverified', NULL)
     RETURNING id`,
    [uniId, `${MARKER} BSc Biology`]
  );
  const p1: number = p1r.rows[0].id;
  const p2: number = p2r.rows[0].id;

  await pool.query(
    `INSERT INTO program_requirements (program_id, min_ielts, subject_requirements, other_requirements,
                                       source_url, last_verified_at, verification_status)
     VALUES
       ($1, 6.5, 'Math A or equivalent (fixture)', 'SAT submitted (fixture)', $2, '2026-09-15 12:00:00', 'verified'),
       ($3, 7.0, NULL, NULL, NULL, NULL, 'unverified')`,
    [p1, s1.url, p2]
  );

  await pool.query(
    `INSERT INTO application_cycles (university_id, program_id, intake, academic_year,
                                     opening_date, deadline, deadline_timezone, application_fee, application_fee_currency,
                                     application_url, source_url, last_verified_at, verification_status)
     VALUES
       ($1, $2, 'Autumn', '2026/2027', '2025-10-01', '2026-03-01', 'Europe/Amsterdam', 50, 'EUR', $3, $3, '2026-09-15 12:00:00', 'verified'),
       ($1, $4, 'Spring', '2026/2027', '2025-08-01', '2026-01-15', NULL, NULL, 'EUR', NULL, NULL, NULL, 'unverified')`,
    [uniId, p1, s1.url, p2]
  );

  await pool.query(
    `INSERT INTO program_sources (program_id, source_id, source_type)
     VALUES ($1, $2, 'official'), ($3, $4, 'third_party')`,
    [p1, s1.id, p1, s2.id]
  );
  await pool.query(
    `INSERT INTO university_sources (university_id, source_id, source_type)
     VALUES ($1, $2, 'official_website'), ($3, $4, 'third_party')`,
    [uniId, s1.id, uniId, s2.id]
  );

  return { uniId, p1, p2, s1: s1.url, s2: s2.url };
}

async function apiGet(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${APP_URL}${path}`);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`\ncheck-provenance — app: ${APP_URL}\n`);

  // ---- Unit: isStaleVerified with a FIXED clock (deterministic) ----
  console.log("stale-label unit tests (fixed now = 2026-10-01):");
  check("data >180d old is stale", isStaleVerified("2025-11-01T08:00:00.000Z", NOW) === true);
  check("data 16d old is not stale", isStaleVerified("2026-09-15T12:00:00.000Z", NOW) === false);
  const exactly180 = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
  check("data exactly 180d old is not stale (boundary)", isStaleVerified(exactly180, NOW) === false);
  const oneDayOver = new Date(NOW.getTime() - (180 * 24 * 60 * 60 + 60 * 60) * 1000).toISOString();
  check("data 180d+1h old is stale", isStaleVerified(oneDayOver, NOW) === true);
  check("null date is never stale (unknown ≠ stale ≠ verified)", isStaleVerified(null, NOW) === false);

  // ---- Fixtures: clean → seed → HTTP assertions → clean ----
  console.log("\nfixture setup (local dev DB, self-cleaning):");
  await cleanFixtures();
  const fx = await seedFixtures();
  console.log(`  seeded university #${fx.uniId}, programs #${fx.p1} and #${fx.p2}`);

  try {
    const { status, body } = await apiGet(`/api/universities/${fx.uniId}`);
    check("API responds 200 with fixture university", status === 200 && body?.university?.id === fx.uniId, {
      status,
      id: body?.university?.id,
    });
    const programs: any[] = body?.programs ?? [];
    const cycles: any[] = body?.applicationCycles ?? [];
    const p1 = programs.find((p) => p.id === fx.p1);
    const p2 = programs.find((p) => p.id === fx.p2);

    console.log("\nprogram-level provenance (verified program):");
    check("p1 present in response", !!p1);
    check("p1.sourceUrl equals fixture URL (no invented data)", p1?.sourceUrl === fx.s1, p1?.sourceUrl);
    check("p1.lastVerifiedAt is the fixture date", p1?.lastVerifiedAt?.startsWith("2026-09-15"), p1?.lastVerifiedAt);
    check("p1.verificationStatus === 'verified'", p1?.verificationStatus === "verified");
    check("p1.isVerified === true", p1?.isVerified === true);
    const p1Sources: any[] = p1?.sources ?? [];
    check("p1.sources has 2 entries (official + third-party)", p1Sources.length === 2, p1Sources.length);
    const off = p1Sources.find((s) => s.sourceType === "official");
    const third = p1Sources.find((s) => s.sourceType === "third_party");
    check("official source: url + title + domain + accessedAt present",
      off?.url === fx.s1 && typeof off?.title === "string" && off?.domain === "provfixture.example" && String(off?.accessedAt).startsWith("2026-09-15"), off);
    check("official source flagged isOfficial", off?.isOfficial === true);
    check("third-party source NOT flagged official, last-checked = fixture date",
      third?.isOfficial === false && String(third?.accessedAt).startsWith("2025-11-01"), third);

    console.log("\nper-requirement provenance:");
    const p1Reqs: any[] = p1?.requirements ?? [];
    check("p1 requirements all carry sourceUrl + status",
      p1Reqs.length > 0 && p1Reqs.every((r) => r.sourceUrl === fx.s1 && r.verificationStatus === "verified"), p1Reqs);
    const p1Ielts = p1Reqs.find((r) => r.requirementType === "ielts");
    check("p1 ielts minimum preserved (6.5)", p1Ielts?.minimumValue === 6.5, p1Ielts);

    console.log("\nunknown ≠ verified (unverified program, no source):");
    check("p2 present in response", !!p2);
    check("p2.sourceUrl is null (nothing invented)", p2?.sourceUrl === null, p2?.sourceUrl);
    check("p2.lastVerifiedAt is null", p2?.lastVerifiedAt === null, p2?.lastVerifiedAt);
    check("p2.verificationStatus === 'unverified'", p2?.verificationStatus === "unverified");
    check("p2.isVerified === false", p2?.isVerified === false);
    check("p2.sources is empty", Array.isArray(p2?.sources) && p2.sources.length === 0, p2?.sources);
    const p2Reqs: any[] = p2?.requirements ?? [];
    check("p2 requirements unverified with null sourceUrl",
      p2Reqs.length > 0 && p2Reqs.every((r) => r.verificationStatus === "unverified" && r.sourceUrl === null), p2Reqs);

    console.log("\ncycle provenance (estimated vs confirmed):");
    check("2 cycles returned", cycles.length === 2, cycles.length);
    const cVerified = cycles.find((c) => c.intake === "Autumn");
    const cUnverified = cycles.find((c) => c.intake === "Spring");
    check("verified cycle: isEstimated === false", cVerified?.isEstimated === false, cVerified?.isEstimated);
    check("verified cycle exposes sourceUrl + lastVerifiedAt",
      cVerified?.sourceUrl === fx.s1 && String(cVerified?.lastVerifiedAt).startsWith("2026-09-15"), cVerified);
    check("unverified cycle: isEstimated === true (deadline NOT shown as confirmed)", cUnverified?.isEstimated === true, cUnverified?.isEstimated);
    check("unverified cycle: sourceUrl null (no fabricated source)", cUnverified?.sourceUrl === null, cUnverified?.sourceUrl);
    check("unverified cycle keeps its deadline VALUE (unknown ≠ deleted)",
      cUnverified?.deadline === "2026-01-15" || cUnverified?.deadline?.startsWith("2026-01-15"), cUnverified?.deadline);

    console.log("\nuniversity-level sources (domain + last-checked):");
    const uniSources: any[] = body?.sources ?? [];
    check("2 university sources", uniSources.length === 2, uniSources.length);
    check("every uni source has domain + accessedAt",
      uniSources.every((s) => s.source?.domain && s.source?.accessedAt), uniSources);
  } finally {
    await cleanFixtures();
    console.log("\nfixtures cleaned up");
  }

  console.log(failures === 0 ? "\ncheck-provenance: PASS" : `\ncheck-provenance: FAIL (${failures} failed)`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("check-provenance: ERROR", e?.message ?? e);
    cleanFixtures().catch(() => {});
    process.exit(1);
  })
  .finally(() => pool.end().catch(() => {}));
