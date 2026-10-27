/**
 * Landing-page performance guards.
 *
 * The regression this file exists for: the landing page shipped **2.2 MB of
 * JavaScript** (688 KB gzipped) because all three dictionaries (1.4 MB of JSON)
 * were imported by a client module, and every visitor parsed all of them before
 * the page could respond. On a phone that reads as "the site is frozen".
 *
 * The rules below are cheap to check and were all violated once already.
 * Run with `npm run test:perf` (the bundle-size part needs a build first).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

console.log("\nPerformance — the landing page must stay light");

check("only English is bundled; the other locales load one at a time", () => {
  const messages = read("src/i18n/messages.ts");
  assert.ok(messages.includes('import en from "./messages/en.json"'), "English stays a static import (it is the fallback)");
  assert.ok(!/^import\s+\w+\s+from\s+"\.\/messages\/(uz|ru)\.json"/m.test(messages), "uz/ru must NOT be static imports");
  assert.ok(messages.includes('await import("./messages/uz.json")'), "uz must be a dynamic import");
  assert.ok(messages.includes('await import("./messages/ru.json")'), "ru must be a dynamic import");
});

check("no client module imports the all-locales dictionary", () => {
  // messages.server.ts pulls in every language; importing it from the browser
  // bundle is exactly the 1.4 MB regression.
  const candidates = [
    "src/i18n/LocaleProvider.tsx",
    "src/app/HomeClient.tsx",
    "src/components/LandingPage.tsx",
    "src/components/AppNote.tsx",
    "src/components/telegram/MiniApp.tsx",
  ];
  let clientFiles = 0;
  for (const file of candidates) {
    const source = read(file);
    if (!source.startsWith('"use client"')) continue;
    clientFiles++;
    assert.ok(!source.includes('from "@/i18n/messages.server"'), `${file} must not import messages.server`);
  }
  assert.ok(clientFiles >= 4, "the check must actually inspect client modules");
});

check("the landing route entry passes one locale, never three", () => {
  const page = read("src/app/page.tsx");
  assert.ok(page.includes("clientMessagesFor(initialLocale)"), "page.tsx must pass the visitor's locale only");
  const home = read("src/app/HomeClient.tsx");
  assert.ok(home.includes("initialMessages={initialMessages}"), "HomeClient must forward the dictionary to LocaleProvider");
  assert.ok(
    (home.match(/<LocaleProvider initialLocale=\{initialLocale\}/g) ?? []).length ===
      (home.match(/initialMessages=\{initialMessages\}/g) ?? []).length,
    "every LocaleProvider branch must receive initialMessages (a language switch would otherwise disagree with SSR)"
  );
});

check("the locale provider stays hydration-safe", () => {
  const provider = read("src/i18n/LocaleProvider.tsx");
  // registerMessages before the first render: synchronous helpers (day labels,
  // the mini app) read `dictionaries[locale]` during render.
  assert.ok(provider.includes("registerMessages(initialLocale, initialMessages)"), "the initial dictionary must be registered in the initial state");
  assert.ok(provider.includes("englishMessages"), "a missing language must fall back to English, never to undefined");
});

/*
 * Bundle budget. `.next/diagnostics/route-bundle-stats.json` is written by
 * `next build`, so this half only runs after a build (CI runs it there).
 */
const statsPath = join(root, ".next/diagnostics/route-bundle-stats.json");
if (existsSync(statsPath)) {
  const stats = JSON.parse(readFileSync(statsPath, "utf8")) as { route: string; firstLoadUncompressedJsBytes: number }[];
  const landing = stats.find((row) => row.route === "/");
  const shell = stats.find((row) => row.route === "/privacy");
  console.log("\nPerformance — first-load JavaScript budget");

  check("the landing page stays under 1.4 MB of JavaScript (was 2.2 MB)", () => {
    assert.ok(landing, "the build must report the / route");
    const kb = Math.round(landing!.firstLoadUncompressedJsBytes / 1024);
    assert.ok(kb < 1400, `landing first-load JS is ${kb} KB — the dictionary regression is back?`);
    console.log(`    landing: ${kb} KB uncompressed`);
  });

  check("the shared shell stays under 1.2 MB", () => {
    assert.ok(shell, "the build must report the /privacy route");
    const kb = Math.round(shell!.firstLoadUncompressedJsBytes / 1024);
    assert.ok(kb < 1200, `shared shell is ${kb} KB`);
    console.log(`    shared shell: ${kb} KB uncompressed`);
  });
} else {
  console.log("\nPerformance — first-load JavaScript budget (skipped: run `npm run build` first)");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
