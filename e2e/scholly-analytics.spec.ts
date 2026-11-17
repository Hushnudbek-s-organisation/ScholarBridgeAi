import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import type { AnalyticsOverview } from "../src/lib/analytics";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  adminEmail: string;
  adminPassword: string;
};

test("Scholly reports unique daily completers and mature retention cohorts to admins", async ({ request }) => {
  const url = "/api/admin/analytics?days=30&fresh=1";
  expect((await request.get(url)).status()).toBe(401);
  expect((await request.post("/api/auth/sign-in", {
    data: { email: fixtures.adminEmail, password: fixtures.adminPassword },
  })).status()).toBe(200);

  const initialResponse = await request.get(url);
  expect(initialResponse.status()).toBe(200);
  const initial = (await initialResponse.json() as AnalyticsOverview).scholly;
  expect(initial).not.toBeNull();
  if (!initial) throw new Error("Scholly analytics missing from admin response");

  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  const profileIds: number[] = [];
  try {
    const { rows } = await pool.query<{ id: number }>(
      "INSERT INTO student_profiles (name, email) VALUES ('Cohort A', $1), ('Cohort B', $2) RETURNING id",
      [`${randomUUID()}@fixture.test`, `${randomUUID()}@fixture.test`],
    );
    profileIds.push(...rows.map(({ id }) => id));
    await pool.query(
      `INSERT INTO scholly_events (user_id, type, created_at)
       SELECT user_id, type, now() - make_interval(days => days_ago) FROM (VALUES
         ($1::int, 'mission_shown', 10), ($1::int, 'dashboard_open', 9),
         ($1::int, 'mission_shown', 3), ($1::int, 'mission_done', 3),
         ($1::int, 'mission_done', 3), ($2::int, 'mission_shown', 9),
         ($2::int, 'onboarding_started', 9)
       ) AS sample(user_id, type, days_ago)`,
      profileIds,
    );

    await pool.query(`
      INSERT INTO scholly_notification_log (id, user_id, type, category, variant, channel, local_day, status, sent_at, opened_at)
      VALUES ($1, $3, 'scholly_daily_mission', 'mission', 'A', 'push', (now() AT TIME ZONE 'Asia/Tashkent')::date,
        'sent', now() - interval '3 minutes', now() - interval '2 minutes'),
        ($2, $4, 'scholly_daily_mission', 'mission', 'B', 'push', (now() AT TIME ZONE 'Asia/Tashkent')::date,
        'sent', now() - interval '3 minutes', NULL)
    `, [randomUUID(), randomUUID(), ...profileIds]);
    await pool.query(`
      INSERT INTO daily_missions (user_id, day, type, status, done_at)
      VALUES ($1, (now() AT TIME ZONE 'Asia/Tashkent')::date, 'fill_profile_fields', 'done', now() - interval '1 minute')
    `, [profileIds[0]]);

    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const result = (await response.json() as AnalyticsOverview).scholly;
    expect(result).toMatchObject({
      active7: initial.active7 + 1,
      active30: initial.active30 + 2,
      retention1: { eligible: initial.retention1.eligible + 2, returned: initial.retention1.returned + 1 },
      retention7: { eligible: initial.retention7.eligible + 2, returned: initial.retention7.returned + 1 },
    });
    for (const variant of ["A", "B"]) {
      const previous = initial.reminderExperiment.find(row => row.variant === variant);
      const completed = variant === "A" ? 1 : 0;
      expect(result?.reminderExperiment).toContainEqual({
        variant, sent: (previous?.sent ?? 0) + 1,
        opened: (previous?.opened ?? 0) + completed, completed: (previous?.completed ?? 0) + completed,
      });
    }
    const day = initial.activity.at(-4)!;
    expect(result?.activity.find(({ date }) => date === day.date)).toEqual({
      date: day.date, visitors: day.visitors + 1, completers: day.completers + 1,
    });
    const started = initial.onboarding.find(({ step }) => step === "started")?.users ?? 0;
    expect(result?.onboarding).toContainEqual({ step: "started", users: started + 1 });
  } finally {
    if (profileIds.length) await pool.query("DELETE FROM student_profiles WHERE id = ANY($1::int[])", [profileIds]);
    await pool.end();
  }
});
