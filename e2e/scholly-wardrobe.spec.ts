import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { schollySeason, wardrobeItem } from "../src/lib/scholly-wardrobe";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number;
  studentPassword: string;
  otherProfileId: number;
};

test("Scholly snow unlock uses the full cross-year window", () => {
  const snow = wardrobeItem("aura", "snow");
  if (snow?.unlock.type !== "season") throw new Error("Missing snow unlock");
  expect(schollySeason("2026-11-30", snow.unlock)).toBeNull();
  expect(schollySeason("2026-12-01", snow.unlock)).toEqual({ start: "2026-12-01", end: "2027-02-28" });
  expect(schollySeason("2027-02-28", snow.unlock)).toEqual({ start: "2026-12-01", end: "2027-02-28" });
  expect(schollySeason("2027-03-01", snow.unlock)).toBeNull();
});

test("Scholly grants a seasonal item once after three qualifying mission days", async () => {
  const testDatabase = process.env.E2E_DATABASE_URL!;
  const previousDatabase = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabase;
  const pool = new Pool({ connectionString: testDatabase });
  try {
    const { grantSeasonalSchollyWardrobe } = await import("../src/lib/scholly-wardrobe.server");
    const localDb = drizzle(pool);
    const { rows: [profile] } = await pool.query(
      "INSERT INTO student_profiles (name, email) VALUES ('Season tester', 'e2e-scholly-season@example.test') RETURNING id",
    );
    const grant = (day: string) => localDb.transaction(tx => grantSeasonalSchollyWardrobe(profile.id, day, tx));
    const owned = async () => (await pool.query(
      "SELECT item_key, source, spent_points FROM scholly_wardrobe_items WHERE user_id = $1", [profile.id],
    )).rows;
    await pool.query(`
      INSERT INTO daily_missions (user_id, day, type, status, done_at)
      SELECT $1, day, 'save_universities', 'done', day::timestamp AT TIME ZONE 'UTC'
      FROM unnest(ARRAY['2026-11-30', '2026-12-02', '2027-01-10', '2027-02-28']::date[]) AS day
    `, [profile.id]);
    await grant("2027-02-27");
    expect(await owned()).toHaveLength(0);
    await grant("2027-03-01");
    expect(await owned()).toHaveLength(0);
    await Promise.all([grant("2027-02-28"), grant("2027-02-28")]);
    await grant("2027-03-01");
    expect(await owned()).toEqual(expect.arrayContaining([
      { item_key: "aura:snow", source: "achievement", spent_points: 0 },
      { item_key: "hat:winter", source: "achievement", spent_points: 0 },
    ]));
    expect(await owned()).toHaveLength(2);
  } finally {
    await pool.end();
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
  }
});

test("Scholly persists purchases once and keeps a temporary preview separate", async ({ page }) => {
  test.setTimeout(90_000);
  const wardrobe = "/api/scholly/wardrobe";
  const email = "e2e-scholly-wardrobe@example.test";
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  try {
    const { rows: [profile] } = await pool.query(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed)
      SELECT 'Wardrobe Tester', $1, password_hash, true FROM student_profiles WHERE id = $2
      RETURNING id
    `, [email, fixtures.studentId]);
    await pool.query("INSERT INTO user_points (profile_id, total_points) VALUES ($1, 250)", [profile.id]);

    expect((await page.request.get(wardrobe)).status()).toBe(401);
    expect((await page.request.post("/api/auth/sign-in", {
      data: { email, password: fixtures.studentPassword },
    })).status()).toBe(200);
    expect((await page.request.get(`${wardrobe}?profileId=${fixtures.otherProfileId}`)).status()).toBe(403);
    expect((await page.request.post(wardrobe, { data: { action: "equip", slot: "body", key: "night" } })).status()).toBe(409);
    const purchase = { action: "buy", slot: "body", key: "purple" };
    const responses = await Promise.all(Array.from({ length: 3 }, () => page.request.post(wardrobe, { data: purchase })));
    for (const response of responses) {
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({ balance: 150, outfit: { body: "purple" } });
    }

    const { rows } = await pool.query(`
      SELECT w.spent_points, p.total_points
      FROM scholly_wardrobe_items w JOIN user_points p ON p.profile_id = w.user_id
      WHERE w.user_id = $1 AND w.item_key = 'body:purple'
    `, [profile.id]);
    expect(rows).toEqual([{ spent_points: 100, total_points: 250 }]);

    await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#dashboard");
    await page.getByRole("button", { name: "Open Scholly chat", exact: true }).click();
    await page.getByRole("button", { name: "Customize", exact: true }).click();
    const panel = page.locator(".sb-scholly-wardrobe");
    const launcher = page.locator(".sb-scholly-launcher .sb-scholly-model");
    const preview = panel.locator(".sb-scholly-model");
    await expect(panel.getByText("4/48 owned")).toBeVisible();
    await expect(launcher).toHaveAttribute("data-body-style", "purple");
    await page.clock.install();
    await panel.getByRole("listitem").filter({ hasText: "Midnight" }).getByRole("button", { name: "Try on" }).click();
    await expect(preview).toHaveAttribute("data-body-style", "night");
    await expect(launcher).toHaveAttribute("data-body-style", "purple");
    await page.clock.fastForward(10_100);
    await expect(preview).toHaveAttribute("data-body-style", "purple");

    await panel.getByRole("button", { name: /^Aura/ }).click();
    await panel.getByRole("listitem").filter({ hasText: "Stars" }).getByRole("button", { name: "Try on" }).click();
    await expect(panel.locator(".sb-scholly-aura[data-aura=stars]")).toBeVisible();
    await expect(panel.locator(".sb-scholly-aura i").first()).toBeHidden();

    await page.goto("/#wardrobe");
    const studio = page.locator(".sb-scholly-wardrobe[data-studio]");
    await studio.getByRole("button", { name: "Bars", exact: true }).click();
    await expect(studio.locator(".sb-scholly-model")).toHaveAttribute("data-companion", "bars");
    await expect(launcher).toHaveAttribute("data-companion", "bars");
    const locked = await page.request.post(wardrobe, { data: { action: "apply", outfit: { companion: "karvon", hat: "crown" } } });
    expect(locked.status()).toBe(409);
    await page.reload();
    await expect(studio.locator(".sb-scholly-model")).toHaveAttribute("data-companion", "bars");
  } finally {
    await pool.end();
  }
});
