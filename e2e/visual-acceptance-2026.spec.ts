/**
 * §12 — REAL browser visual acceptance for the CURRENT revision.
 *
 * Saves "after" screenshots next to the historical docs/redesign/baseline set,
 * at 390px and 1440px, light/dark, EN/UZ/RU. A source regex or
 * react-dom/server render cannot prove responsive quality; these are actual
 * Chromium screenshots plus layout assertions. Screenshots do NOT replace the
 * interactive E2E suite — both are run.
 *
 * Run: node scripts/run-e2e.mjs e2e/visual-acceptance-2026.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import en from "../src/i18n/messages/en.json";

const OUT = join(process.cwd(), process.env.E2E_VISUAL_OUTPUT_DIR??"docs/redesign/after-2026-11-06");
mkdirSync(OUT, { recursive: true });

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentEmail: string; studentPassword: string; adminEmail: string; adminPassword: string;
};

async function signIn(page: Page, admin = false) {
  await page.goto("/", { waitUntil: "domcontentloaded" }).catch(async (e) => {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await page.waitForLoadState("domcontentloaded");
  });
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

const DESTINATIONS: Array<{ id: string; hash: string }> = [
  { id: "dashboard", hash: "#dashboard" },
  { id: "universities", hash: "#universities" },
  { id: "university-detail", hash: "#universities/search" },
  { id: "grants", hash: "#scholarships" },
  { id: "finance", hash: "#study-plan/tools" },
  { id: "tracker", hash: "#applications" },
  { id: "documents", hash: "#materials" },
  { id: "chancing", hash: "#chancing" },
  { id: "profile", hash: "#profile" },
];

async function assertLayout(page: Page, tag: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.scrollWidth, `${tag}: horizontal overflow ${JSON.stringify(metrics)}`)
    .toBeLessThanOrEqual(metrics.innerWidth + 1);
  // The primary action must not be covered by a fixed/sticky element.
  const covered = await page.evaluate(() => {
    const el = document.querySelector('[data-action="primary"]') as HTMLElement | null;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && !el.contains(top) && top !== el;
  });
  expect(covered, `${tag}: primary action is covered by another element`).toBe(false);
}

for (const locale of ["en", "uz", "ru"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [390, 1440] as const) {
      test(`visual ${locale}/${theme}/${width}px`, async ({ page, context }) => {
        test.setTimeout(180_000);
        await context.addCookies([{
          name: "scholarbridge_locale", value: locale,
          url: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
        }]);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        await signIn(page, false);
        if (theme === "dark") {
          const current = await page.locator("html").evaluate((r) => r.classList.contains("dark"));
          if (!current) {
            const btn = page.getByRole("banner").getByRole("button", { name: /switch to dark mode/i });
            if (await btn.count()) await btn.first().click();
          }
        }
        // Only the EN pass captures every destination; UZ/RU focus on the
        // highest-risk long-text surfaces (dashboard, catalog, grants).
        const targets = locale === "en"
          ? DESTINATIONS
          : DESTINATIONS.filter((d) => ["dashboard", "universities", "grants", "documents"].includes(d.id));
        for (const dest of targets) {
          await page.evaluate((h) => { window.location.hash = h; }, dest.hash);
          await page.waitForTimeout(220);
          await assertLayout(page, `${locale}/${theme}/${width}/${dest.id}`);
          if (locale === "en" || dest.id === "dashboard") {
            await page.screenshot({
              path: join(OUT, `${dest.id}-${width}-${theme}-${locale}.png`),
              fullPage: false,
              animations: "disabled",
            });
          }
        }
      });
    }
  }
}


// Dense admin working screens use the SAME design system, checked separately
// with a real admin session (a student cannot reach these tabs).
for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440] as const) {
    test(`visual admin ${theme}/${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await signIn(page, true);
      if (theme === "dark") {
        const current = await page.locator("html").evaluate((r) => r.classList.contains("dark"));
        if (!current) {
          const btn = page.getByRole("banner").getByRole("button", { name: /switch to dark mode/i });
          if (await btn.count()) await btn.first().click();
        }
      }
      for (const dest of [{ id: "admin-review", hash: "#admin/review" }, { id: "admin-refresh", hash: "#admin/refresh" }]) {
        await page.evaluate((h) => { window.location.hash = h; }, dest.hash);
        await page.waitForTimeout(220);
        await assertLayout(page, `admin/${theme}/${width}/${dest.id}`);
        await page.screenshot({
          path: join(OUT, `${dest.id}-${width}-${theme}-en.png`),
          fullPage: false, animations: "disabled",
        });
      }
    });
  }
}
