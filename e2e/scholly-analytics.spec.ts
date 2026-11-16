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

    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const result = (await response.json() as AnalyticsOverview).scholly;
    expect(result).toMatchObject({
      active7: initial.active7 + 1,
      active30: initial.active30 + 2,
      retention1: { eligible: initial.retention1.eligible + 2, returned: initial.retention1.returned + 1 },
      retention7: { eligible: initial.retention7.eligible + 2, returned: initial.retention7.returned + 1 },
    });
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
