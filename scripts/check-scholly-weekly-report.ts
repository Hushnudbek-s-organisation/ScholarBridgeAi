import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { formatWeeklyReport, weeklyReportQuery, type SchollyWeeklyReportRow } from "../src/lib/scholly-weekly-report";

async function main() {
  const databaseDir = mkdtempSync(join(tmpdir(), "scholly-weekly-report-"));
  const port = 55564;
  let serverLog = "";
  const postgres = new EmbeddedPostgres({
    databaseDir, user: "test", password: "test", port, persistent: true,
    postgresFlags: ["-c", "unix_socket_directories="],
    onLog: (message) => { serverLog += message; },
  });
  let pool: Pool | undefined;
  let started = false;
  try {
    await postgres.initialise();
    await postgres.start();
    started = true;
    pool = new Pool({ connectionString: `postgresql://test:test@127.0.0.1:${port}/postgres` });
    await pool.query(`
      CREATE TABLE student_profiles (id int PRIMARY KEY, created_at timestamp NOT NULL);
      CREATE TABLE scholly_events (user_id int, type text, payload jsonb, created_at timestamptz);
      CREATE TABLE points_ledger (profile_id int, points int, created_at timestamp);
      CREATE TABLE essay_versions (
        id serial PRIMARY KEY, profile_id int, university_id int, essay_type text, word_count int, created_at timestamp
      );
      INSERT INTO student_profiles VALUES (1, '2026-01-01'), (2, '2026-01-01'), (3, '2026-11-15 14:00');
      INSERT INTO scholly_events VALUES
        (1, 'mission_done', '{"missionId": 1}', '2026-11-08 13:29:59+00'),
        (1, 'mission_done', '{"missionId": 2}', '2026-11-08 13:30:00+00'),
        (1, 'mission_done', '{"missionId": 2}', '2026-11-08 13:30:01+00'),
        (1, 'mission_done', '{"missionId": 3}', '2026-11-15 13:30:00+00'),
        (1, 'mission_shown', '{"missionId": 4}', '2026-11-09 13:30:00+00'),
        (2, 'mission_done', '{"missionId": 5}', '2026-11-09 13:30:00+00');
      INSERT INTO points_ledger VALUES
        (1, 10, '2026-11-08 13:29:59'),
        (1, 20, '2026-11-08 13:30:00'),
        (1, 10, '2026-11-15 13:30:00'),
        (1, 0, '2026-11-13 10:00'),
        (1, -5, '2026-11-13 10:01'),
        (2, 30, '2026-11-14 13:30:00');
      INSERT INTO essay_versions (profile_id, university_id, essay_type, word_count, created_at) VALUES
        (1, NULL, 'sop', 100, '2026-10-01'),
        (1, NULL, 'sop', 130, '2026-11-04'),
        (1, NULL, 'sop', 180, '2026-11-09'),
        (1, NULL, 'sop', 180, '2026-11-10'),
        (1, NULL, 'sop', 165, '2026-11-11'),
        (1, 10, 'sop', 60, '2026-11-12'),
        (1, NULL, 'sop', 200, '2026-11-15 13:30:00'),
        (1, NULL, 'scholarship', 400, '2026-11-12'),
        (2, NULL, 'sop', 300, '2026-11-12');
    `);
    const db = drizzle(pool);

    async function report(profileId: number, timeZone: string, now: string) {
      const { rows } = await db.execute<SchollyWeeklyReportRow>(weeklyReportQuery(profileId, timeZone, new Date(now)));
      return rows[0] && formatWeeklyReport(rows[0]);
    }

    const cutoff = "2026-11-15T13:30:00Z";
    const previous = await report(1, "Asia/Tashkent", "2026-11-15T13:29:59Z");
    assert.equal(previous?.report?.endedOn, "2026-11-08");
    assert.equal(previous?.nextReportAt, new Date(cutoff).toISOString());
    const latest = await report(1, "Asia/Tashkent", cutoff);
    assert.deepEqual(latest?.report, {
      endedOn: "2026-11-15",
      current: { missions: 1, points: 20, sopWords: 95 },
      previous: { missions: 1, points: 10, sopWords: 30 },
    });
    assert.equal(latest?.nextReportAt, "2026-11-22T13:30:00.000Z");
    assert.deepEqual(await report(1, "invalid/timezone", cutoff), latest);
    assert.deepEqual((await report(2, "Asia/Tashkent", cutoff))?.report?.current, { missions: 1, points: 30, sopWords: 300 });
    assert.equal((await report(3, "Asia/Tashkent", cutoff))?.report, null);
    assert.equal(await report(4, "Asia/Tashkent", cutoff), undefined);

    const beforeDst = await report(1, "America/New_York", "2026-10-25T22:30:00Z");
    assert.equal(beforeDst?.report?.endedOn, "2026-10-25");
    assert.equal(beforeDst?.nextReportAt, "2026-11-01T23:30:00.000Z");
    console.log("Scholly weekly report cutoffs, timezone/DST, profile isolation, ledger and SOP totals passed.");
  } catch (error) {
    if (!started) throw new Error(`Could not start test Postgres: ${serverLog}`, { cause: error });
    throw error;
  } finally {
    await pool?.end();
    if (started) await postgres.stop();
    rmSync(databaseDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
