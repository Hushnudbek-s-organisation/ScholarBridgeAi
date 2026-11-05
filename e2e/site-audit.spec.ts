import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { NAV_SECTIONS } from "../src/lib/navSections";
import en from "../src/i18n/messages/en.json";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentEmail: string; studentPassword: string; adminEmail: string; adminPassword: string; verifiedUniversityId: number; scholarshipId: number;
};

async function signIn(page: Page, admin = false) {
  await page.goto("/");
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page.getByRole("button", { name: en.landing.navAria, exact: true }).click();
  }
  await page.getByRole("button", { name: en.landing.signIn, exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="email"]').fill(admin ? fixtures.adminEmail : fixtures.studentEmail);
  await dialog.locator('input[type="password"]').fill(admin ? fixtures.adminPassword : fixtures.studentPassword);
  await dialog.locator('form button[type="submit"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeVisible();
}

for (const locale of ["en", "uz", "ru"] as const) {
  test(`public routes, mobile overflow and recovery states (${locale})`, async ({ page, context }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([{ name: "scholarbridge_locale", value: locale, url: process.env.E2E_BASE_URL! }]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`${new URL(page.url()).pathname}: ${error.message}`));
    const routes = ["/", "/universities", "/scholarships", "/features", "/forgot-password", "/reset-password", "/privacy", "/terms", "/tg",
      `/universities/${fixtures.verifiedUniversityId}`, `/scholarships/${fixtures.scholarshipId}`,
      "/certificates/not-a-real-certificate", "/certificates/%25", "/parent/not-a-valid-token", "/audit-not-a-real-page"];
    const coverage = [];
    for (const route of routes) {
      const response = await page.goto(route);
      const expectedStatus = route === "/audit-not-a-real-page" ? 404 : 200;
      expect(response?.status(), `${route} should return its intended page/recovery status`).toBe(expectedStatus);
      await expect(page.locator("body")).not.toBeEmpty();
      if (route.startsWith("/certificates/")) await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      if (route.startsWith("/parent/")) await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `${route}: no whole-page horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
      coverage.push({ route, status: response?.status(), dimensions, controlsRendered: await page.locator("button, a, input, select, textarea").count() });
    }
    expect(errors, "no unhandled browser exceptions on public routes").toEqual([]);
    await testInfo.attach(`public-routes-${locale}`, { body: JSON.stringify(coverage, null, 2), contentType: "application/json" });
  });
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`all student destinations and pane buttons (${viewport.width}px)`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const serverErrors: string[] = [];
    page.on("pageerror", (error) => errors.push(`${new URL(page.url()).pathname}: ${error.message}`));
    page.on("response", (response) => { if (response.status() === 500 && response.url().includes("/api/")) serverErrors.push(new URL(response.url()).pathname); });
    await signIn(page);
    const coverage = [];
    for (const section of NAV_SECTIONS) {
      await page.evaluate((hash) => { window.location.hash = hash; }, `#${section.id}`);
      if (section.panes.length) {
        for (const pane of section.panes) {
          const tab = page.locator(`#hub-tab-${pane.id}`);
          await expect(tab, `${section.id}/${pane.id} navigation button is reachable`).toBeVisible();
          await tab.click();
          await expect(tab).toHaveAttribute("aria-selected", "true");
          const panel = page.locator(`#hub-panel-${pane.id}`);
          await expect(panel).toBeVisible();
          await expect(panel).not.toBeEmpty();
          await expect(panel.getByText(en.hubs.sectionFailed, { exact: true })).toHaveCount(0);
          coverage.push({ section: section.id, pane: pane.id, controlsRendered: await panel.locator("button, a, input, select, textarea").count() });
        }
      } else {
        await expect(page.locator("main").first()).toBeVisible();
        coverage.push({ section: section.id, pane: null });
      }
      // Reachable panels can still be in their entrance animation; validate
      // the settled layout, without weakening the one-pixel overflow limit.
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
        message: `${section.id}: no whole-page horizontal overflow after entrance`,
      }).toBeLessThanOrEqual(1).catch(async (error) => {
        const offenders = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).flatMap((element) => {
          const box = element.getBoundingClientRect();
          if (box.right <= innerWidth + 1 || !box.width) return [];
          return [{ tag: element.tagName, class: element.getAttribute("class"), text: element.textContent?.slice(0, 100), right: box.right, width: box.width }];
        }));
        await testInfo.attach("horizontal-overflow.json", { body: JSON.stringify(offenders, null, 2), contentType: "application/json" });
        throw error;
      });
    }
    expect(errors, "no unhandled browser exceptions during navigation").toEqual([]);
    expect(serverErrors, "no server 500 responses during navigation").toEqual([]);
    await testInfo.attach(`student-navigation-${viewport.width}`, { body: JSON.stringify(coverage, null, 2), contentType: "application/json" });
  });
}

test("public language/theme controls and missing reset link are usable", async ({ page }) => {
  await page.goto("/universities");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("uz");
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.getByRole("radio").last().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/reset-password");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  // Recovery is a real route, not an inert action.
  await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
});

// Read-only navigation: never press send, publish, charge, reset or delete.
test("all admin sections render and account support is readable", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${new URL(page.url()).pathname}: ${error.message}`));
  await signIn(page, true);
  await page.evaluate(() => { window.location.hash = "#admin"; });
  const navigation = page.getByRole("navigation", { name: en.admin.title, exact: true });
  await expect(navigation).toBeVisible();
  const coverage = [];
  for (const [id, label] of Object.entries(en.admin.tab)) {
    const button = navigation.getByRole("button", { name: label, exact: true });
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: label, exact: true }).first()).toBeVisible();
    await expect(page.getByText(en.admin.sectionFailed, { exact: true })).toHaveCount(0);
    coverage.push({ section: id, label });
  }
  expect(errors).toEqual([]);
  await testInfo.attach("admin-read-only-navigation", { body: JSON.stringify(coverage, null, 2), contentType: "application/json" });
});

// Exercise the real phone drawer, account links and signed-cookie logout.
test("mobile account utility buttons and logout work", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${new URL(page.url()).pathname}: ${error.message}`));
  await signIn(page);
  const coverage = [];
  for (const id of ["payments", "notifications", "rewards", "parent"] as const) {
    await page.getByRole("button", { name: en.nav.openMenu, exact: true }).filter({ visible: true }).first().click();
    const drawer = page.getByRole("dialog", { name: en.nav.mainNav, exact: true });
    await expect(drawer).toBeVisible();
    const name = en.nav[id].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await drawer.getByRole("button", { name: new RegExp(`^${name}(?: PRO)?$`, "i") }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator("#main-content")).not.toBeEmpty();
    coverage.push(id);
  }
  await page.getByRole("button", { name: en.nav.openMenu, exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("dialog", { name: en.nav.mainNav, exact: true }).getByRole("button", { name: en.nav.logout, exact: true }).click();
  await expect(page.getByRole("button", { name: en.landing.navAria, exact: true })).toBeVisible();
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  expect(errors).toEqual([]);
  await testInfo.attach("account-utility-buttons", { body: JSON.stringify(coverage), contentType: "application/json" });
});

test("rapid destination changes cannot be undone by an exiting hub's pane callback", async ({ page }) => {
  await signIn(page);
  for (let run = 0; run < 3; run++) {
    await page.evaluate(async () => {
      for (const hash of ["#universities/search", "#scholarships/opportunities", "#study-plan/plan"]) {
        location.hash = hash;
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    });
    await expect(page.locator("#hub-tab-plan")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#hub-panel-plan")).toBeVisible();
    // Let the old exit animation and its passive effects finish as well.
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/#study-plan(?:\/plan)?$/);
    await expect(page.locator("#hub-panel-plan")).toBeVisible();
  }
});
