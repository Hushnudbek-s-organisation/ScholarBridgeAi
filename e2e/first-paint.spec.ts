import { test, expect } from "@playwright/test";

test("landing hero and primary actions paint even before JavaScript runs", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hero = page.locator("main #hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    await expect(hero.locator("a[href='/universities']").first()).toBeVisible();
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
  await page.goto("/uz", { waitUntil: "domcontentloaded" });
  const results = page.locator("#liveMatchList a");
  await expect(results).toHaveCount(3);
  await expect(results.first()).toHaveAttribute("href", /^\/(universities|scholarships)\/\d+$/);
  await page.locator("#fitDegree").selectOption("Master");
  await expect(page.locator("#fitUniversityLink")).toHaveAttribute("href", /degree=Master/);
  await expect(page.locator("#fitScholarshipLink")).toHaveAttribute("href", /^\/scholarships\?/);
  expect(failures).toEqual([]);
});
