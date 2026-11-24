import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number; studentEmail: string; studentPassword: string;
};

test("Scholly keeps its own 3D appearance even with a saved legacy outfit", async ({ page }, testInfo) => {
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL });
  const endpoint = "/api/scholly/wardrobe";
  try {
    await pool.query(`INSERT INTO scholly_profile (user_id, outfit) VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET outfit=EXCLUDED.outfit`, [fixtures.studentId, { companion: "bars", hat: "crown" }]);
    await page.context().addCookies([{name:"scholarbridge_locale", value:"en", url:process.env.E2E_BASE_URL!}]);
    const signIn = await page.request.post("/api/auth/sign-in", { data: { email:fixtures.studentEmail, password:fixtures.studentPassword } });
    expect(signIn.status()).toBe(200);
    expect((await page.request.get(endpoint)).status()).toBe(404);
    expect((await page.request.post(endpoint, {data:{action:"companion", key:"bars"}})).status()).toBe(404);
    await page.setViewportSize({width:1440,height:900});
    await page.goto("/#wardrobe");
    await expect(page.getByRole("heading",{name:/Phase 12 E2E Student/,level:1})).toBeVisible();
    const launcher = page.getByRole("button", {name:"Open Scholly chat"});
    const model = launcher.locator('.sb-scholly-model[data-companion="scholly"]');
    await expect(model).toBeVisible();
    const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
    if (webgl) await expect(model).toHaveAttribute("data-rendering", "3d");
    await expect(launcher).toHaveCSS("width","128px");
    await launcher.screenshot({ path: testInfo.outputPath("scholly-companion.png"), animations: "disabled" });
    const dock = page.getByTestId("grouped-dock");
    expect((await dock.boundingBox())!.width).toBeLessThan(950);
    await launcher.click();
    const chat = page.getByRole("region",{name:"Scholly"});
    await expect(chat).toBeVisible();
    await expect(chat.getByRole("button",{name:"Customize",exact:true})).toHaveCount(0);
    await chat.getByRole("button", { name: "Turn Scholly around" }).click();
    await chat.getByRole("button", { name: "Wave to Scholly" }).click();
    await expect(launcher).toHaveAttribute("data-motion", "wave");
    await chat.getByRole("button",{name:"Close chat"}).click();
    await page.setViewportSize({width:390,height:820});
    await expect(launcher).toHaveCSS("width","112px");
    await expect(dock).toBeVisible();
    expect((await dock.boundingBox())!.width).toBeLessThan(390);
  } finally {
    await pool.query("UPDATE scholly_profile SET outfit = '{}'::jsonb WHERE user_id=$1", [fixtures.studentId]);
    await pool.end();
  }
});

test("Scholly remembers structured feedback only when its owner opts in", async ({ page }) => {
  const endpoint = "/api/scholly/learning";
  const profile = `/api/scholly/profile?profileId=${fixtures.studentId}`;
  expect((await page.request.post(endpoint, { data: { action: "visits", topic: "universities" } })).status()).toBe(401);
  expect((await page.request.post("/api/auth/sign-in", {
    data: { email: fixtures.studentEmail, password: fixtures.studentPassword },
  })).status()).toBe(200);
  await page.request.post(endpoint, { data: { action: "preference", enabled: false } });
  try {
    const ignored = await page.request.post(endpoint, { data: { action: "visits", topic: "universities" } });
    expect((await ignored.json()).learning).toEqual({ enabled: false, topics: {} });
    const enabled = await page.request.post(endpoint, { data: { action: "preference", enabled: true } });
    expect((await enabled.json()).learning).toEqual({ enabled: true, topics: {} });
    const payload = { action: "visits", topic: "universities" };
    await Promise.all([page.request.post(endpoint, { data: payload }), page.request.post(endpoint, { data: payload })]);
    expect((await page.request.post(endpoint, { data: { action: "helpful", topic: "free text" } })).status()).toBe(400);
    const feedback = await page.request.post(endpoint, { data: { action: "helpful", topic: "universities", text: "This private text must not be stored" } });
    expect((await feedback.json()).learning.topics.universities).toEqual({ visits: 2, helpful: 1, needsWork: 0 });
    const enabledProfile = await (await page.request.get(profile)).json();
    expect(enabledProfile.profile.learning.topics.universities.visits).toBe(2);
    expect(JSON.stringify(enabledProfile.profile.learning)).not.toContain("private text");
  } finally {
    await page.request.post(endpoint, { data: { action: "preference", enabled: false } });
  }
  expect((await (await page.request.get(profile)).json()).profile.learning).toEqual({ enabled: false, topics: {} });
});
