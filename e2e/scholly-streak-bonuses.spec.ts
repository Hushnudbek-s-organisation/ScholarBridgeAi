import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";
import { schollyDayKey } from "../src/lib/scholly-missions";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number;
  studentPassword: string;
  verifiedUniversityId: number;
};

function shiftDay(day: string, offset: number) {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

async function withNewStudent(
  request: APIRequestContext,
  run: (pool: Pool, profileId: number, day: string) => Promise<void>,
) {
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  let profileId: number | undefined;
  const email = `e2e-scholly-bonus-${randomUUID()}@example.test`;
  try {
    const { rows: [profile] } = await pool.query<{ id: number }>(`
      INSERT INTO student_profiles (name, email, password_hash, country, onboarding_completed)
      SELECT 'Scholly Bonus Tester', $1, password_hash, 'Uzbekistan', true
      FROM student_profiles WHERE id = $2
      RETURNING id
    `, [email, fixtures.studentId]);
    profileId = profile.id;
    expect((await request.post("/api/auth/sign-in", {
      data: { email, password: fixtures.studentPassword },
    })).status()).toBe(200);
    await run(pool, profileId, schollyDayKey(new Date(), "Asia/Tashkent"));
  } finally {
    if (profileId) await pool.query("DELETE FROM student_profiles WHERE id = $1", [profileId]);
    await pool.end();
  }
}

test("Scholly issues each streak milestone only once after an authenticated meaningful action", async ({ request }) => {
  await withNewStudent(request, async (pool, profileId, day) => {
    await pool.query(`
      INSERT INTO points_ledger (profile_id, points, reason, created_at)
      SELECT $1, 0, 'daily_active', day::timestamp + interval '12 hours'
      FROM unnest($2::date[]) AS day
    `, [profileId, Array.from({ length: 29 }, (_, index) => shiftDay(day, -index - 1))]);

    const milestones = () => pool.query<{ reason: string; points: number }>(`
      SELECT reason, points FROM points_ledger
      WHERE profile_id = $1 AND reason IN ('scholly_streak_3','scholly_streak_7','scholly_streak_14','scholly_streak_30')
      ORDER BY points
    `, [profileId]);
    expect((await request.get("/api/scholly/streak")).status()).toBe(200);
    expect((await milestones()).rows).toEqual([]);

    const saveUniversity = () => request.post("/api/saved-universities", {
      data: { profileId, universityId: fixtures.verifiedUniversityId },
    });
    for (const response of await Promise.all([saveUniversity(), saveUniversity()])) expect(response.ok()).toBe(true);
    expect((await milestones()).rows).toEqual([
      { reason: "scholly_streak_3", points: 5 }, { reason: "scholly_streak_7", points: 20 },
      { reason: "scholly_streak_14", points: 40 }, { reason: "scholly_streak_30", points: 100 },
    ]);
  });
});

test("Scholly grants the comeback bonus with the first verified mission after seven inactive days", async ({ request }) => {
  await withNewStudent(request, async (pool, profileId, day) => {
    await pool.query(`
      INSERT INTO points_ledger (profile_id, points, reason, created_at)
      VALUES ($1, 0, 'daily_active', $2::date::timestamp + interval '12 hours')
    `, [profileId, shiftDay(day, -8)]);
    await pool.query(`
      INSERT INTO daily_missions (user_id, day, type, size_min, points, target_count, theme, criteria)
      VALUES ($1, $2, 'fill_profile_fields', 1, 10, 1, 'plan', '{"missingFields":["country"]}')
    `, [profileId, day]);

    const mission = () => request.get("/api/scholly/mission");
    const responses = await Promise.all([mission(), mission(), mission()]);
    for (const response of responses) expect(response.ok()).toBe(true);
    const payloads = await Promise.all(responses.map(response => response.json()));
    expect(payloads.filter(result => result.justCompleted)).toHaveLength(1);
    const { rows } = await pool.query<{ reason: string; points: number }>(`
      SELECT reason, points FROM points_ledger WHERE profile_id = $1
      AND reason IN ('scholly_daily_mission','scholly_comeback') ORDER BY reason
    `, [profileId]);
    expect(rows).toEqual([
      { reason: "scholly_comeback", points: 10 }, { reason: "scholly_daily_mission", points: 10 },
    ]);
  });
});
