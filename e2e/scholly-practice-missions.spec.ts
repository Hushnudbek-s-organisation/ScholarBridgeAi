import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { schollyDayKey } from "../src/lib/scholly-missions";
import type { SchollyIeltsExercise } from "../src/lib/scholly-ielts.server";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
const missionUrl = "/api/scholly/mission";

function practiceDatabase() {
  const url = new URL(process.env.E2E_DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
  return new Pool({ connectionString: url.toString() });
}

async function practiceAccount(page: Page, db: Pool, email: string) {
  await db.query(`INSERT INTO universities (name, country, description, website_url, is_active)
    SELECT 'Scholly practice fixture university', 'United States', 'Isolated test fixture', 'https://example.test', false
    WHERE (SELECT count(*) FROM universities) < 3`);
  const { rows: [profile] } = await db.query<{ id: number }>(
    `INSERT INTO student_profiles
       (name, email, password_hash, country, target_major, degree_level, gpa, gpa_scale,
        ielts_score, budget_annual_usd, preferred_countries, created_at, onboarding_completed)
     SELECT 'Practice Mission Fixture', $1, password_hash, 'Uzbekistan', 'Computer Science', 'Bachelor',
       3.7, 4, 6, 20000, '["US"]', now() - interval '30 days', true
       FROM student_profiles WHERE id = $2 RETURNING id`,
    [email, fixtures.studentId],
  );
  await db.query(
    `INSERT INTO saved_universities (profile_id, university_id)
       SELECT $1, id FROM universities ORDER BY id LIMIT 3`,
    [profile.id],
  );
  await db.query("INSERT INTO essay_versions (profile_id, word_count) VALUES ($1, 600)", [profile.id]);
  await db.query(
    "INSERT INTO scholly_profile (user_id, lang, onboarding_state, onboarding_step) VALUES ($1, 'en', 'completed', 'complete')",
    [profile.id],
  );
  const signedIn = await page.request.post("/api/auth/sign-in", {
    data: { email, password: fixtures.studentPassword },
  });
  expect(signedIn.ok()).toBe(true);
  return profile.id;
}

test("IELTS practice offers five words and awards the mission once", async ({ page }) => {
  test.setTimeout(120_000);
  const db = practiceDatabase();
  try {
    const profileId = await practiceAccount(page, db, "scholly-ielts-mission@example.test");
    await db.query("INSERT INTO test_plans (profile_id, test_type, target_score) VALUES ($1, 'ielts', 7)", [profileId]);

    const open = await page.request.get(missionUrl);
    expect(open.ok()).toBe(true);
    const before = await open.json();
    expect(before.mission).toMatchObject({ type: "ielts_vocabulary", target: 5, status: "pending" });
    const exercise: SchollyIeltsExercise = before.mission.exercise;
    const answers = exercise.questions.map((question, i) => question.options.indexOf(exercise.words[i].definition));
    expect(answers).toHaveLength(5);
    const wrong = await page.request.post(missionUrl, {
      data: { action: "submit_ielts", missionId: before.mission.id, answers: answers.map((index) => (index + 1) % 3) },
    });
    expect(wrong.ok()).toBe(true);
    expect(await wrong.json()).toMatchObject({ mission: { status: "pending" }, ieltsCorrect: 0, points: before.points });

    await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
    await page.goto("/#dashboard");
    await expect(page.getByTestId("journey-dashboard")).toBeVisible({ timeout: 60_000 });
    const mission = page.getByRole("region", { name: "Today’s mission" });
    await mission.getByRole("button", { name: "Study the words" }).click();
    await expect(mission.getByRole("term")).toHaveCount(5);
    await mission.getByRole("button", { name: "Start the quiz" }).click();
    const groups = await mission.locator("fieldset").all();
    for (const [index, group] of groups.entries()) {
      await group.getByRole("radio").nth(answers[index]).check();
    }
    await mission.getByRole("button", { name: "Check answers" }).click();
    await expect(mission.getByText("Completed — points awarded")).toBeVisible();

    const retry = await page.request.post(missionUrl, {
      data: { action: "submit_ielts", missionId: before.mission.id, answers },
    });
    expect(retry.ok()).toBe(true);
    expect(await retry.json()).toMatchObject({ mission: { status: "done" }, points: before.points + 10, justCompleted: false });
  } finally {
    await db.end();
  }
});

test("a planned departure triggers visa practice and only a finished answer counts", async ({ page }) => {
  test.setTimeout(120_000);
  const db = practiceDatabase();
  try {
    const profileId = await practiceAccount(page, db, "scholly-visa-mission@example.test");
    const date = schollyDayKey(new Date(Date.now() + 60 * 86_400_000), "Asia/Tashkent");
    const invalid = await page.request.put("/api/departure", { data: { departureDate: "2026-02-30" } });
    expect(invalid.status()).toBe(400);
    const saved = await page.request.put("/api/departure", { data: { departureDate: date } });
    expect(saved.ok()).toBe(true);
    const departure = await page.request.get("/api/departure");
    expect(await departure.json()).toMatchObject({ departureDate: date });

    const open = await page.request.get(missionUrl);
    expect(open.ok()).toBe(true);
    const before = await open.json();
    expect(before.mission).toMatchObject({ type: "visa_practice", target: 1, status: "pending" });

    const empty = await page.request.post("/api/visa/analyze", { data: { countryCode: "US", messages: [{ role: "user", text: "   " }] } });
    expect(empty.ok()).toBe(true);
    const pending = await page.request.get(missionUrl);
    expect(await pending.json()).toMatchObject({ mission: { status: "pending", progress: 0 }, points: before.points });

    const finished = await page.request.post("/api/visa/analyze", { data: {
      profileId, countryCode: "US", messages: [
        { role: "officer", text: "Why did you choose this program?" },
        { role: "user", text: "I chose this computer science program because its course in data structures fits my study plan." },
      ],
    } });
    expect(finished.ok()).toBe(true);
    const refreshed = await page.request.get(missionUrl);
    expect(await refreshed.json()).toMatchObject({ mission: { status: "done", progress: 1 }, points: before.points + 10 });
    const cleared = await page.request.put("/api/departure", { data: { departureDate: null } });
    expect(await cleared.json()).toMatchObject({ departureDate: null });
  } finally {
    await db.end();
  }
});

test("star Sprint pays 30 once and a mutual seven-day streak pays both friends once", async ({ page, playwright, baseURL }) => {
  const db = practiceDatabase();
  const other = await playwright.request.newContext({ baseURL });
  try {
    const profileId = await practiceAccount(page, db, "scholly-sprint-friend@example.test");
    const signedIn = await other.post("/api/auth/sign-in", {
      data: { email: fixtures.adminEmail, password: fixtures.adminPassword },
    });
    expect(signedIn.ok()).toBe(true);
    const day = schollyDayKey(new Date(), "Asia/Tashkent");
    const invite = await page.request.post("/api/scholly/friends", { data: { action: "invite" } });
    expect(invite.ok()).toBe(true);
    const { code } = await invite.json();
    expect((await page.request.post("/api/scholly/friends", { data: { action: "accept", code } })).status()).toBe(409);
    expect((await other.post("/api/scholly/friends", { data: { action: "accept", code } })).ok()).toBe(true);
    const { rows: [pair] } = await db.query<{ friend_id: number }>(
      "UPDATE scholly_friend_links SET accepted_at = now() - interval '9 days' WHERE inviter_id = $1 RETURNING friend_id",
      [profileId],
    );
    for (const id of [profileId, pair.friend_id]) {
      await db.query(`INSERT INTO points_ledger (profile_id, points, reason, created_at)
        SELECT $1, 0, 'daily_active', ($2::date - tick)::timestamp + interval '6 hours'
        FROM generate_series(1,7) AS tick`, [id, day]);
    }
    const { rows: [mission] } = await db.query<{ id: number }>(`INSERT INTO daily_missions
      (user_id,day,type,points,target_count,is_star) VALUES ($1,$2,'ielts_vocabulary',20,5,true) RETURNING id`, [profileId, day]);
    const start = () => page.request.post(missionUrl, { data: { action: "start_sprint", missionId: mission.id } });
    const startedResponse = await start();
    expect(startedResponse.ok()).toBe(true);
    const started = (await startedResponse.json()).mission;
    expect((await (await start()).json()).mission.sprint).toEqual(started.sprint);
    const exercise: SchollyIeltsExercise = started.exercise;
    const answers = exercise.questions.map((question, index) => question.options.indexOf(exercise.words[index].definition));
    const submit = () => page.request.post(missionUrl, { data: { action: "submit_ielts", missionId: mission.id, answers } });
    for (const response of await Promise.all([submit(), submit()])) {
      expect(response.ok()).toBe(true);
      expect((await response.json()).mission).toMatchObject({ status: "done", points: 30 });
    }
    const { rows: awards } = await db.query<{ id: number; profile_id: number; points: number; reason: string }>(
      `SELECT id, profile_id, points, reason FROM points_ledger WHERE profile_id IN ($1, $2)
        AND reason IN ('scholly_daily_mission', 'scholly_friend_streak') ORDER BY id`, [profileId, pair.friend_id],
    );
    expect(awards.filter(row => row.reason === "scholly_friend_streak").map(row => row.points)).toEqual([15, 15]);
    const missionAwards = awards.filter(row => row.reason === "scholly_daily_mission" && row.profile_id === profileId);
    expect(missionAwards.map(row => row.points)).toEqual([30]);

    const revoke = { awardId: missionAwards[0].id, reason: "spam" };
    const before = await (await page.request.get("/api/scholly/points")).json();
    const denied = await page.request.post("/api/gamification/reverse", { data: revoke });
    expect(denied.status()).toBe(403);
    const first = await other.post("/api/gamification/reverse", { data: revoke });
    expect(first.ok()).toBe(true);
    expect(await first.json()).toMatchObject({ reversed: true, lifetimePoints: before.lifetimePoints, balance: before.balance - 30 });
    const repeated = await other.post("/api/gamification/reverse", { data: revoke });
    expect(await repeated.json()).toMatchObject({ reversed: false, balance: before.balance - 30 });
  } finally {
    await other.dispose();
    await db.end();
  }
});
