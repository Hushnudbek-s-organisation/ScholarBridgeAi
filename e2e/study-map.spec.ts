import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number; studentPassword: string;
};

test("the restored My Plan dock opens Study Map and saved notes remain private", async ({ page }) => {
  test.setTimeout(150_000);
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL });
  const email = "e2e-study-map@example.test";
  const map = "/api/study-map";
  try {
    const migration = readFileSync("supabase/add_study_map.sql", "utf8");
    await pool.query(migration);
    await pool.query(migration);
    const { rows: [policy] } = await pool.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.study_map_entries'::regclass",
    );
    expect(policy.relrowsecurity).toBe(true);
    const { rows: [learner] } = await pool.query(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed, ielts_score)
      SELECT 'Map Learner', $1, password_hash, true, 7.5 FROM student_profiles WHERE id = $2 RETURNING id
    `, [email, fixtures.studentId]);
    const signIn = async (address: string) => {
      expect((await page.request.post("/api/auth/sign-in", {
        data: { email: address, password: fixtures.studentPassword },
      })).status()).toBe(200);
    };

    expect((await page.request.get(map)).status()).toBe(401);
    await signIn(email);
    expect((await page.request.get(map)).status()).toBe(403);
    await pool.query("INSERT INTO subscriptions (profile_id, current_period_end) VALUES ($1, NOW() + INTERVAL '1 day')", [learner.id]);
    const { rows: [exam] } = await pool.query(
      "INSERT INTO test_plans (profile_id, test_type) VALUES ($1, 'ielts') RETURNING id", [learner.id],
    );
    const { rows: [attempt] } = await pool.query(
      "INSERT INTO test_attempts (test_plan_id, test_date, score) VALUES ($1, '2026-11-23', 7.5) RETURNING id", [exam.id],
    );

    const initialMap = await page.request.get(map);
    expect(initialMap.status()).toBe(200);
    expect((await initialMap.json()).nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "profile:ielts", title: "IELTS · 7.5" }),
      expect.objectContaining({ id: `attempt:${attempt.id}`, relatedId: `exam:${exam.id}`, date: "2026-11-23" }),
    ]));
    const card = await page.request.post(map, { data: { action: "save", kind: "card", title: "What is an idiom?", text: "A fixed phrase", links: ["profile:ielts"] } });
    expect(card.status()).toBe(201);
    const { id } = await card.json();
    const update = await page.request.post(map, { data: { action: "save", id, kind: "card", title: "What is an English idiom?", text: "A fixed phrase", links: ["profile:ielts"] } });
    expect(update.status()).toBe(200);

    const day = "2026-11-23";
    const daily = await Promise.all([1, 2].map(() => page.request.post(map, { data: { action: "daily", day } })));
    expect(daily.every(response => response.ok())).toBe(true);
    const dailyIds = await Promise.all(daily.map(response => response.json()));
    expect(dailyIds[0].id).toBe(dailyIds[1].id);
    const addNote = async (title: string, text: string) => {
      const response = await page.request.post(map, { data: { action: "save", kind: "note", title, text, links: [] } });
      expect(response.status()).toBe(201);
      return (await response.json()).id as string;
    };
    const targetId = await addNote("Interview prep", "---\nfolder: Admissions/Visa\ntags: [visa, checklist]\n---\n## Questions\n- [ ] Rehearse the introduction");
    await addNote("Speaking log", "# Session one\nTry [[Admissions/Visa/Interview prep|visa prep]] #speaking");

    await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#dashboard");
    const dock = page.getByTestId("grouped-dock");
    await expect(dock).toBeVisible();
    const plan = dock.getByRole("button", { name: /my plan/i });
    await plan.click();
    await expect(plan).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: /study map/i }).click();
    await expect(page.getByRole("heading", { name: "Study map PRO" })).toBeVisible();
    await expect(page.locator(".sb-study-3d[data-webgl=ready] canvas")).toBeVisible();
    await expect(page).toHaveURL(/#study-map$/);
    await page.setViewportSize({ width: 390, height: 820 });
    await plan.click();
    await expect(page.getByRole("button", { name: /financial plan/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(plan).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    const own = await (await page.request.get(map)).json();
    expect(own.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: targetId, title: "Interview prep" }),
      expect.objectContaining({ title: "Speaking log", text: expect.stringContaining("[[Admissions/Visa/Interview prep|visa prep]]") }),
    ]));
    expect((await page.request.post(map, { data: { action: "review", id, remembered: true } })).ok()).toBe(true);
    const imported = await page.request.post(map, { data: { action: "import", items: [
      { kind: "note", title: "Imported", text: "# Plan", links: [] },
    ] } });
    expect(imported.status()).toBe(201);
    const importedId = (await imported.json()).id;
    expect((await page.request.post(map, { data: { action: "delete", id: importedId } })).ok()).toBe(true);
    expect((await (await page.request.get(map)).json()).trash).toEqual([
      expect.objectContaining({ id: importedId }),
    ]);
    expect((await page.request.post(map, { data: { action: "restore", id: importedId } })).ok()).toBe(true);

    const deleteDaily = await page.request.post(map, { data: { action: "delete", id: dailyIds[0].id } });
    expect(deleteDaily.ok()).toBe(true);
    const reopenDaily = await page.request.post(map, { data: { action: "daily", day } });
    expect((await reopenDaily.json()).id).toBe(dailyIds[0].id);
    expect((await (await page.request.get(map)).json()).trash).toEqual([]);
    expect((await page.request.post(map, { data: { action: "purge", id } })).status()).toBe(404);

    const { rows: [other] } = await pool.query(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed)
      SELECT 'Other Learner', 'e2e-study-map-other@example.test', password_hash, true
      FROM student_profiles WHERE id = $1 RETURNING id, email
    `, [fixtures.studentId]);
    await pool.query("INSERT INTO subscriptions (profile_id, current_period_end) VALUES ($1, NOW() + INTERVAL '1 day')", [other.id]);
    await signIn(other.email);
    expect((await (await page.request.get(`${map}?profileId=${learner.id}`)).json()).entries).toEqual([]);
    expect((await page.request.post(map, { data: { action: "delete", id } })).status()).toBe(404);
  } finally {
    await pool.end();
  }
});
