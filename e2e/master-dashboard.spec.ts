import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"),
);
const output = "test-results/master-2026-11-07/after";
mkdirSync(output, { recursive: true });

async function dashboard(
  page: Page,
  locale: string,
  theme: string,
  width: number,
) {
  await page
    .context()
    .addCookies([
      {
        name: "scholarbridge_locale",
        value: locale,
        url: process.env.E2E_BASE_URL!,
      },
    ]);
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.addInitScript(
    (value) => localStorage.setItem("scholarbridge_theme", value),
    theme,
  );
  const response = await page.request.post("/api/auth/sign-in", {
    data: { email: fixtures.studentEmail, password: fixtures.studentPassword },
  });
  expect(response.status()).toBe(200);
  await page.goto("/#dashboard");
  await expect(page.getByTestId("journey-dashboard")).toBeVisible();
  await expect(page.getByTestId("grouped-dock")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

for (const locale of ["en", "uz", "ru"]) {
  test(`actual dashboard, disclosure focus and responsive layout: ${locale}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await dashboard(page, locale, "dark", 1440);
    const dock = page.getByTestId("grouped-dock");
    await expect(dock.getByRole("button")).toHaveCount(6); // Six visible disclosures; mobile-only More stays hidden.
    const disclosures = dock.locator("button[aria-expanded]");
    await expect(disclosures).toHaveCount(6);
    await page.screenshot({
      path: `${output}/dashboard-first-${locale}.png`,
      animations: "disabled",
    });
    const plan = disclosures.nth(1);
    await plan.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator(`#${await plan.getAttribute("aria-controls")}`);
    await expect(panel).toBeVisible();
    await page.screenshot({
      path: `${output}/dock-plan-${locale}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Tab");
    expect(
      await panel.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(plan).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(plan).toBeFocused();
    await disclosures.nth(0).click();
    await expect(page.locator('[id^="dock-panel-"]')).toHaveCount(1);
    await plan.click();
    await expect(page.locator('[id^="dock-panel-"]')).toHaveCount(1);
    await page.getByTestId("journey-dashboard").locator(":scope > header").click();
    await expect(page.locator('[id^="dock-panel-"]')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 850));
    await page.screenshot({
      path: `${output}/dashboard-scroll-${locale}.png`,
      animations: "disabled",
    });
    await page.getByRole("banner").locator('button[aria-haspopup="dialog"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(dock).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${output}/dashboard-mobile-${locale}.png`,
      animations: "disabled",
    });
    await dock.getByRole("button").last().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: `${output}/mobile-sheet-${locale}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("light dashboard and original public catalogue layouts", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await dashboard(page, "en", "light", 1440);
  await page.screenshot({
    path: `${output}/dashboard-light.png`,
    animations: "disabled",
  });
  for (const route of ["universities", "scholarships"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${output}/${route}.png`,
      animations: "disabled",
    });
  }
});

test("vault self-claims, expiry, ownership and atomic failed application links", async ({
  page,
}) => {
  await dashboard(page, "en", "light", 1440);
  const initial = await (await page.request.get("/api/vault/documents")).json();
  const createdResponse = await page.request.post("/api/vault/documents", {
    data: {
      title: "FICTIONAL expired self-claim",
      docType: "passport",
      status: "verified",
      expiresAt: "2020-01-01",
    },
  });
  expect(createdResponse.status()).toBe(200);
  const created = (await createdResponse.json()).document;
  expect(created.status).toBe("self_confirmed");
  const listing = await (await page.request.get("/api/vault/documents")).json();
  const item = listing.documents.find(
    (row: { id: number }) => row.id === created.id,
  );
  expect(item.status).toBe("expired");
  expect(item.verificationProvenance).toBeNull();
  const forbiddenCreate = await page.request.post("/api/vault/documents", {
    data: { title: "must not persist", applicationIds: [2147483647] },
  });
  expect(forbiddenCreate.status()).toBe(403);
  const forbiddenPatch = await page.request.patch("/api/vault/documents", {
    data: {
      id: created.id,
      title: "must roll back",
      applicationIds: [2147483647],
    },
  });
  expect(forbiddenPatch.status()).toBe(403);
  const final = await (await page.request.get("/api/vault/documents")).json();
  expect(final.documents.length).toBe(initial.documents.length + 1);
  expect(
    final.documents.find((row: { id: number }) => row.id === created.id).title,
  ).toBe("FICTIONAL expired self-claim");
  expect(
    (
      await page.request.get(
        `/api/vault/documents?profileId=${fixtures.otherProfileId}`,
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.patch("/api/vault/documents", {
        data: { id: created.id, fileUrl: "javascript:alert(1)" },
      })
    ).status(),
  ).toBe(400);
});

test("dashboard data error keeps navigation and retry functional", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const response=await page.request.post("/api/auth/sign-in",{data:{email:fixtures.studentEmail,password:fixtures.studentPassword}});
  expect(response.status()).toBe(200);
  await page.route("**/api/dashboard?**",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"FICTIONAL isolated upstream outage"})}));
  await page.goto("/#dashboard");
  await expect(page.getByTestId("grouped-dock")).toBeVisible();
  const retry=page.getByRole("button",{name:"Try again",exact:true});
  await expect(retry).toBeVisible();
  await page.screenshot({path:`${output}/dashboard-error.png`,animations:"disabled"});
  await page.unroute("**/api/dashboard?**");
  await retry.click();
  await expect(page.getByTestId("journey-dashboard")).toBeVisible();
});
