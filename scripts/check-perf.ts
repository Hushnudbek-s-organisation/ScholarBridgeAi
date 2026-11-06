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
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

check("the hub panes are code-split, not one chunk", () => {
  const hubs = read("src/components/hubs/index.tsx");
  // The one exception is PremiumGate: a tiny wrapper rendered in three places,
  // splitting it would cost more in requests than it saves.
  const staticImports = [...hubs.matchAll(/^import \{([^}]+)\} from "(@\/components\/[^"]+)";$/gm)]
    .map((m) => m[2])
    // Shared, tiny primitives that every hub needs are allowed to stay static:
    // a gate wrapper rendered three times, and the shell's own UI kit.
    .filter((from) => !["@/components/PremiumGate", "@/components/ui/journey", "@/components/ui/hubs", "@/components/ui/Button"].includes(from));
  assert.deepEqual(staticImports, [], `hub panes must be lazy: ${staticImports.join(", ")}`);
  const lazy = [...hubs.matchAll(/dynamic\(\(\) => import\("@\/components\/([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(lazy.length >= 30, `only ${lazy.length} lazy panes — the split was lost`);
});

check("the app shell asks for its configuration once", () => {
  const clients = [
    "src/components/Navbar.tsx",
    "src/components/SectionIntro.tsx",
    "src/components/BrandingImage.tsx",
    "src/app/HomeClient.tsx",
  ];
  for (const file of clients) {
    const source = read(file);
    assert.ok(!source.includes('fetch("/api/config/nav"'), `${file} must use loadBootConfig(), not its own /api/config/nav call`);
    assert.ok(!source.includes('fetch("/api/config/guide"'), `${file} must use loadBootConfig(), not its own /api/config/guide call`);
    assert.ok(!source.includes('fetch("/api/config/branding"'), `${file} must use loadBootConfig(), not its own /api/config/branding call`);
  }
  assert.ok(read("src/lib/bootConfig.ts").includes('fetch("/api/config/boot")'), "one boot request");
});

check("public visits do not mount closed auth/profile dialogs or heavyweight loading primitives", () => {
  const home = read("src/app/HomeClient.tsx");
  assert.match(home, /const profilePicker = isPickerOpen \?/);
  assert.match(home, /isProfileModalOpen && <ProfileModal/);
  assert.match(home, /import \{ ProfilePicker \} from "@\/components\/ProfilePicker"/);
  assert.doesNotMatch(home, /const ProfilePicker = dynamic/);
  assert.match(home, /from "@\/components\/ui\/PanelSkeleton"/);
});

check("the hero is visible in server HTML, without waiting for animation hydration", () => {
  const landing = read("src/components/LandingPage.tsx");
  // Extra layout attributes do not change the SSR-visible hero contract.
  assert.match(landing, /<(?:motion|Motion)\.div initial=\{false\} animate="visible" variants=\{heroGroup\}[^>]*>/);
  assert.doesNotMatch(landing, /initial=\{\{ opacity: 0, y: 28/);
});

check("theme switching does not animate every descendant and SVG", () => {
  const css = read("src/app/globals.css");
  assert.doesNotMatch(css, /html\.theme-transition \*/);
  assert.match(css, /html\.theme-transition :where\(body, header, main, nav, aside, footer\)/);
});

check("below-fold campus images and detached scroll animations do not compete with startup", () => {
  const landing = read("src/components/LandingPage.tsx");
  // PR #132 moved the campus images into an idle-deferred chunk. Assert the
  // lazy loader against the file that actually renders/observes them, so a
  // marker comment in LandingPage.tsx can never satisfy this guard again.
  const marquee = read("src/components/landing/DeferredMarquee.tsx");
  assert.match(marquee, /data-campus-src=\{campusPhotoSrc/);
  assert.match(marquee, /rootMargin: "160px"/);
  assert.doesNotMatch(marquee, /fetchPriority: "high"|eagerCount/);
  // The shared scroll engine (and its teardown) still lives in LandingPage.
  assert.match(landing, /if \(subs.size === 0\)/);
  assert.match(landing, /resizeObserver\?\.disconnect\(\)/);
});

check("destination changes never wait for outgoing nested animations", () => {
  const transition = read("src/components/motion/PageTransition.tsx").split("export function SectionTransition")[0];
  assert.doesNotMatch(transition, /<AnimatePresence/);
  assert.match(transition, /key=\{transitionKey\}/);
});

check("an exiting hub cannot overwrite a newer navigation target", () => {
  assert.match(read("src/app/HomeClient.tsx"), /if \(linked && linked.section !== activeTab\) return/);
});

check("the analytics beacon stays out of the first three seconds", () => {
  const tracker = read("src/components/SiteTracker.tsx");
  assert.ok(/scheduleWhenIdle\([\s\S]*?\}, 3000, 3000\)/.test(tracker), "SiteTracker must be deferred by 3 s");
});

check("Framer Motion features are lazy, not part of the landing first load", () => {
  const provider = read("src/components/motion/MotionProvider.tsx");
  assert.match(provider, /LazyMotion/);
  assert.match(provider, /strict/);
  assert.match(provider, /import\("\.\/features"\)/);
  const features = read("src/components/motion/features.ts");
  assert.match(features, /domMax/, "layoutId shared-element pills need domMax");
  // `strict` throws at runtime if any `motion.*` component is left inside the
  // provider; catch it statically before the bundle creeps back up.
  const queue = [join(root, "src/components")];
  while (queue.length) {
    const dir = queue.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.name.endsWith(".tsx") && /<motion\./.test(readFileSync(full, "utf8"))) {
        throw new Error(`${full} still imports the full motion bundle`);
      }
    }
  }
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

  check("the landing page stays under 1.3 MB of JavaScript (was 2.2 MB)", () => {
    assert.ok(landing, "the build must report the / route");
    const kb = Math.round(landing!.firstLoadUncompressedJsBytes / 1024);
    assert.ok(kb < 1300, `landing first-load JS is ${kb} KB — the dictionary regression is back?`);
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
