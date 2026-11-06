import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import en from "../src/i18n/messages/en.json";

declare global {
  interface Window { __speed: { lcp: number; cls: number; blockingMs: number; longTasks: number; lcpElement: string } }
}
const stage = process.env.PERF_STAGE;
if (stage && !["before", "after"].includes(stage)) throw new Error("PERF_STAGE must be before or after");
test.skip(!stage, "Opt-in repeatable browser benchmark: set PERF_STAGE=before or after");

async function twoFrames(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
for (const profile of ["desktop", "mobile"] as const) {
  test(`browser performance (${profile})`, async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(300_000);
    const samples = [];
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({ baseURL, viewport: profile === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, locale: "en-US" });
      // External image/CDN hosts are unreachable in this sandbox. Block ONLY
      // external origins equally in both runs, not first-party scripts or APIs.
      let externalRequests = 0;
      await context.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL!).origin) { externalRequests++; return route.abort("blockedbyclient"); }
        return route.continue();
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      if (profile === "mobile") {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      }
      await page.addInitScript(() => {
        window.__speed = { lcp: 0, cls: 0, blockingMs: 0, longTasks: 0, lcpElement: "" };
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) {
          const item = entry as PerformanceEntry & { element?: Element };
          window.__speed.lcp = item.startTime;
          window.__speed.lcpElement = item.element?.tagName ?? "";
        } }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) {
          const item = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!item.hadRecentInput) window.__speed.cls += item.value;
        } }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => { for (const item of list.getEntries()) {
          window.__speed.blockingMs += Math.max(0, item.duration - 50); window.__speed.longTasks++;
        } }).observe({ type: "longtask", buffered: true });
      });
      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      // Fixed post-DCL observation window; not a Lighthouse score or field INP.
      await page.waitForTimeout(4000);
      const initial = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        return { ...window.__speed, ttfbMs: navigation.responseStart, domContentLoadedMs: navigation.domContentLoadedEventEnd,
          fcpMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0,
          scriptDecodedBytes: resources.filter((r) => /\.js(?:\?|$)/.test(r.name)).reduce((sum, r) => sum + r.decodedBodySize, 0),
          resourceRequests: resources.length, domNodes: document.querySelectorAll("*").length,
          analyticsStartMs: resources.find((r) => r.name.includes("/api/track"))?.startTime ?? null };
      });
      const beforeClick = await page.evaluate(() => performance.now());
      // Playwright's default OS colour preference is not stable across hosts.
      // Accept either accessible label and assert a REAL toggle, rather than
      // hardcoding that the very first state must be light.
      const themeSwitch = page.getByRole("banner").getByRole("button", { name: /switch to (?:dark|light) mode/i });
      const darkBefore = await page.locator("html").evaluate((root) => root.classList.contains("dark"));
      await themeSwitch.click();
      const darkAfter = await page.locator("html").evaluate((root) => root.classList.contains("dark"));
      expect(darkAfter).toBe(!darkBefore);
      await twoFrames(page);
      const themeClickMs = await page.evaluate(() => performance.now()) - beforeClick;
      if (profile === "mobile") await page.getByRole("button", { name: en.landing.navAria, exact: true }).click();
      const beforeDialog = await page.evaluate(() => performance.now());
      await page.getByRole("button", { name: en.landing.signIn, exact: true }).first().click();
      await expect(page.getByRole("dialog").locator('input[type="email"]')).toBeVisible();
      await twoFrames(page);
      const signInDialogMs = await page.evaluate(() => performance.now()) - beforeDialog;
      const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as { studentEmail: string; studentPassword: string };
      await page.getByRole("dialog").locator('input[type="email"]').fill(fixture.studentEmail);
      await page.getByRole("dialog").locator('input[type="password"]').fill(fixture.studentPassword);
      const loginStart = await page.evaluate(() => performance.now());
      await page.getByRole("dialog").locator('button[type="submit"]').click();
      await expect(page.locator("#main-content")).toBeVisible();
      const signInShellMs = await page.evaluate(() => performance.now()) - loginStart;
      const transitions = [];
      for (const target of ["universities/search", "scholarships/browse", "universities/search"]) {
        const start = await page.evaluate((hash) => { const now = performance.now(); location.hash = hash; return now; }, `#${target}`);
        const pane = target.split("/")[1];
        // A hash change is asynchronous (hashchange -> React state -> panel
        // mount). Assert the tab selection first, then the panel, with a
        // benchmark-appropriate timeout instead of the 12s default: a cold
        // browser cache with CDP cache disabled can legitimately take longer.
        await expect(page.locator(`#hub-tab-${pane}`))
          .toHaveAttribute("aria-selected", "true", { timeout: 20_000 });
        const panel = page.locator(`#hub-panel-${pane}`);
        await expect(panel).toBeVisible({ timeout: 20_000 });
        await expect(panel.locator("input").first()).toBeVisible({ timeout: 20_000 });
        await twoFrames(page);
        transitions.push({ target, readyMs: await page.evaluate(() => performance.now()) - start });
      }
      expect(errors).toEqual([]);
      samples.push({ run: run + 1, ...initial, externalRequests, themeClickMs, signInDialogMs, signInShellMs, transitions });
      await context.close();
    }
    const result = { stage, profile, samples, conditions: { coldBrowserCache: true, locale: "en", runs: 3, cpuSlowdown: profile === "mobile" ? 4 : 1, roundTripLatencyMs: profile === "mobile" ? 150 : 0, downloadMbps: profile === "mobile" ? 1.6 : null, externalOrigins: "blocked equally: sandbox limitation; image delivery not measured", data: "disposable two-university fixtures, not production catalogue load", observationWindow: "4 seconds after DOMContentLoaded and visible heading", interactionMetric: "browser-driven click/hash to visible control + two animation frames; not field INP" } };
    mkdirSync("test-results/performance", { recursive: true });
    writeFileSync(`test-results/performance/${stage}-${profile}.json`, JSON.stringify(result, null, 2) + "\n");
    await testInfo.attach(`${stage}-${profile}`, { body: JSON.stringify(result), contentType: "application/json" });
  });
}
