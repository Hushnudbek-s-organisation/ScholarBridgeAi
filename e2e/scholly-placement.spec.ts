import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));

async function openDashboard(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.context().addCookies([{
    name: "scholarbridge_locale",
    value: "en",
    url: process.env.E2E_BASE_URL!,
  }]);
  const signIn = await page.request.post("/api/auth/sign-in", {
    data: { email: fixtures.studentEmail, password: fixtures.studentPassword },
  });
  expect(signIn.ok()).toBe(true);
  await page.goto("/#dashboard");
  await expect(page.getByTestId("journey-dashboard")).toBeVisible();
}

test("Scholly clears the measured dock on desktop", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboard(page, 1440);
  const launcher = page.getByRole("button", { name: "Open Scholly chat" });
  await expect(launcher).toHaveCSS("width", "128px");
  await expect(launcher).toHaveCSS("height", "128px");
  const dock = await page.getByTestId("grouped-dock").boundingBox();
  const companion = await launcher.boundingBox();
  expect(dock!.y - companion!.y - companion!.height).toBeCloseTo(12, 0);
  expect(1440 - companion!.x - companion!.width).toBeCloseTo(12, 0);
});

test("Scholly docks on mobile, keeps a dragged position, and yields to the keyboard", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboard(page, 390);
  const launcher = page.locator(".sb-scholly-launcher");
  const dock = page.getByTestId("grouped-dock");
  await expect(launcher).toHaveCSS("width", "112px");
  await expect(launcher).toHaveCSS("height", "112px");
  await expect(launcher).toHaveAttribute("data-placement", "dock");
  await expect(page.locator("html")).toHaveAttribute("data-scholly-docked", "");
  const initial = (await launcher.boundingBox())!;
  expect(initial.y + initial.height).toBeLessThan((await dock.boundingBox())!.y);

  await page.mouse.move(initial.x + initial.width / 2, initial.y + initial.height / 2);
  await page.mouse.down();
  await page.mouse.move(150, 310, { steps: 8 });
  await page.mouse.up();
  await expect(launcher).not.toHaveAttribute("data-placement", "dock");
  const dragged = (await launcher.boundingBox())!;
  expect(dragged.x + dragged.width / 2).toBeCloseTo(150, 0);
  expect(dragged.y + dragged.height / 2).toBeCloseTo(310, 0);
  await page.reload();
  await expect(launcher).not.toHaveAttribute("data-placement", "dock");
  const restored = (await launcher.boundingBox())!;
  expect(restored.x).toBeCloseTo(dragged.x, 0);
  expect(restored.y).toBeCloseTo(dragged.y, 0);

  const currentDock = (await dock.boundingBox())!;
  await page.mouse.move(restored.x + restored.width / 2, restored.y + restored.height / 2);
  await page.mouse.down();
  await page.mouse.move(350, currentDock.y + currentDock.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(launcher).toHaveAttribute("data-placement", "dock");

  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    // Mobile Safari can pan by the same amount as the viewport shrinks.
    Object.defineProperties(viewport, {
      height: { configurable: true, value: innerHeight - 240 },
      offsetTop: { configurable: true, value: 240 },
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect(launcher).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-scholly-docked");
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Reflect.deleteProperty(viewport, "height");
    Reflect.deleteProperty(viewport, "offsetTop");
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect(launcher).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-scholly-docked", "");

  for (const route of ["visa/speaking", "visa/daily-speaking", "payments", "materials/documents"]) {
    await page.evaluate(hash => { window.location.hash = hash; }, route);
    await expect(launcher).toHaveCSS("width", "112px");
    await expect(launcher).toHaveCSS("height", "112px");
    await expect(launcher).toHaveAttribute("data-motion", "idle");
  }
});
