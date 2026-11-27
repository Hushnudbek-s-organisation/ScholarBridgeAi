import { test, expect } from "@playwright/test";

test("landing hero and primary actions paint even before JavaScript runs", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hero = page.locator("main #hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    await expect(hero.locator("[data-preset=aziza]")).toBeVisible();
  } finally { await context.close(); }
});

test("landing guide photos load when a visitor reaches the steps", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const photos = page.locator("#steps img.bento-card__photo");
  await expect(photos).toHaveCount(4);
  for (const photo of await photos.all()) {
    await expect(photo).toHaveAttribute("loading", "lazy");
  }
  const lastPhoto = photos.last();
  await lastPhoto.scrollIntoViewIfNeeded();
  await expect(lastPhoto).toHaveAttribute("src", /^\/landing\/flight\/step[1-4]\.webp$/);
  await expect.poll(() => lastPhoto.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test("landing university and scholarship discovery work without signing up", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Landing interactions unavailable")) failures.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/uz", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#liveMatchList .match-row").first()).toBeVisible();
  await page.locator("[data-preset=jasur]").click();
  await expect(page.locator("#gpaSlider")).toHaveValue("4.5");
  await expect(page.locator("#ieltsSlider")).toHaveValue("7");
  await expect(page.locator("#budgetSlider")).toHaveValue("0");
  const nav = page.locator("#flight-page-sections");
  await page.locator("[data-flight-menu]").click();
  await expect(nav.locator('a[href="/scholarships"]')).toBeVisible();
  await nav.locator('a[href="/universities"]').click();
  await expect(page).toHaveURL(/\/universities(?:[?#]|$)/);
  await expect(page.getByRole("main")).toBeVisible();
  expect(failures).toEqual([]);
});
