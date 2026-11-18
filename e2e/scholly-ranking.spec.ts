import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));

test("regional rankings require opt-in and hide names, small cohorts and revoked points", async ({ request }) => {
  const url = "/api/scholly/ranking";
  expect((await request.get(url)).status()).toBe(401);
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  const ids: number[] = [];
  const email = `ranking-${randomUUID()}@example.test`;
  try {
    const profiles = await pool.query<{ id: number }>(`
      INSERT INTO student_profiles (name, email, password_hash, country, onboarding_completed)
      SELECT 'Ranking Fixture', CASE WHEN n = 0 THEN $1 ELSE 'ranking-' || n || $1 END,
        password_hash, CASE WHEN n = 5 THEN 'Kazakhstan' WHEN n = 1 THEN 'O‘zbekiston' ELSE 'Uzbekistan' END, true
      FROM student_profiles CROSS JOIN generate_series(0, 6) n WHERE id = $2
      ORDER BY n RETURNING id
    `, [email, fixture.studentId]);
    ids.push(...profiles.rows.map(row => row.id));
    await pool.query(`
      INSERT INTO scholly_profile (user_id, notif_prefs)
      SELECT id, '{"regionalRanking":true}'::jsonb FROM unnest($1::int[]) id
    `, [ids.slice(1, 6)]);
    await pool.query(`
      INSERT INTO points_ledger (profile_id, points, bucket, reason, created_at)
      SELECT id, n * 10, 'main', 'scholly_daily_mission', timezone('UTC', now())
      FROM unnest($1::int[]) WITH ORDINALITY AS entries(id, n)
    `, [ids]);
    await pool.query(`
      WITH award AS (
        INSERT INTO points_ledger (profile_id, points, bucket, reason, created_at)
        VALUES ($1, 100, 'main', 'scholly_application_submitted', timezone('UTC', now()))
        RETURNING id
      )
      INSERT INTO points_ledger (profile_id, points, bucket, reason, idempotency_key)
      SELECT $1, -100, 'spend', 'scholly_abuse_reversal', 'scholly:' || $1 || ':abuse-reversal:' || id
      FROM award
    `, [ids[0]]);
    expect((await request.post("/api/auth/sign-in", { data: { email, password: fixture.studentPassword } })).ok()).toBe(true);
    expect(await (await request.get(url)).json()).toEqual({ country: "UZ", joined: false, people: 0, own: null, leaders: [] });

    const join = await request.put(url, { data: { joined: true } });
    expect(join.ok()).toBe(true);
    expect(await join.json()).toEqual({
      country: "UZ", joined: true, people: 5, own: { rank: 5, score: 10 },
      leaders: [50, 40, 30, 20, 10].map((score, index) => ({ rank: index + 1, score })),
    });

    await pool.query("UPDATE scholly_profile SET notif_prefs = '{}' WHERE user_id = $1", [ids[1]]);
    expect(await (await request.get(url)).json()).toEqual({ country: "UZ", joined: true, people: 0, own: null, leaders: [] });
    expect(await (await request.put(url, { data: { joined: false } })).json()).toMatchObject({ joined: false });
  } finally {
    if (ids.length) await pool.query("DELETE FROM student_profiles WHERE id = ANY($1::int[])", [ids]);
    await pool.end();
  }
});
