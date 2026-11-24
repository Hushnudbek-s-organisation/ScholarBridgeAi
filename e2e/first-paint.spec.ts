import { test, expect } from "@playwright/test";

test("landing hero and primary actions paint even before JavaScript runs", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hero = page.locator("main #hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    await expect(hero.getByRole("button").first()).toBeVisible();
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
