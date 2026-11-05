import { test, expect } from "@playwright/test";

test("landing hero and primary actions paint even before JavaScript runs", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hero = page.locator("#top > section").first();
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    await expect(hero.getByRole("button").first()).toBeVisible();
  } finally { await context.close(); }
});

test("campus photos are deferred, then load when their cards approach the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => {
    if (route.request().resourceType() === "image") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="128"><rect width="288" height="128" fill="#64748b"/></svg>' });
    return route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const photos = page.locator("#campuses img[data-campus-src]");
  await expect(photos).toHaveCount(48);
  expect(await page.locator("#campuses img[src]").count()).toBeLessThan(48);
  // The first DOM copy may be horizontally outside the animated track. Test
  // cards that actually approach the viewport, including relative proxy URLs.
  await page.locator("#university-marquee-title").scrollIntoViewIfNeeded();
  const loaded = page.locator("#campuses img[src]");
  await expect.poll(() => loaded.count()).toBeGreaterThan(0);
  await expect(loaded.first()).toHaveAttribute("src", /^(https?:|\/api\/image)/);
  await expect.poll(() => loaded.first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.locator("#campuses img[src]").count()).toBeLessThan(48);
});
