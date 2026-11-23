import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number; studentEmail: string; studentPassword: string;
};

test("Scholly keeps its own 3D appearance even with a saved legacy outfit", async ({ page }) => {
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
    await expect(launcher.locator('.sb-scholly-model[data-companion="scholly"]')).toBeVisible();
    await expect(launcher).toHaveCSS("width","128px");
    const dock = page.getByTestId("grouped-dock");
    expect((await dock.boundingBox())!.width).toBeLessThan(950);
    await launcher.click();
    const chat = page.getByRole("region",{name:"Scholly"});
    await expect(chat).toBeVisible();
    await expect(chat.getByRole("button",{name:"Customize",exact:true})).toHaveCount(0);
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
