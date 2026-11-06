/**
 * Internal-surface regression guard.
 *
 * Static checks only: navigation destinations / panes / legacy aliases,
 * i18n key coverage, public Telegram landing pages, and known design-system
 * fixes. It does NOT replace a real logged-in user flow test.
 *
 * Run: npm run test:internal-surfaces
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  LEGACY_SECTION_ALIASES,
  LINKABLE_SECTION_IDS,
  NAV_DESTINATION_IDS,
  NAV_GROUP_I18N,
  NAV_GROUPS,
  NAV_SECTIONS,
  NAV_UTILITY_SECTIONS,
  resolveNavTarget,
} from "../src/lib/navSections";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const messages = (locale: string) =>
  JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, any>;

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

console.log("\nInternal surfaces — static regression guard");

check("all six journey groups and their labels are present in EN/UZ/RU", () => {
  assert.equal(NAV_GROUPS.length, 6);
  for (const locale of ["en", "uz", "ru"]) {
    const nav = messages(locale).nav;
    for (const group of NAV_GROUPS) {
      const key = NAV_GROUP_I18N[group];
      assert.ok(nav[key], `${locale}.nav.${key} missing`);
      assert.notEqual(nav[key].trim(), "");
    }
  }
});

check("every destination and utility screen is rendered by HomeClient", () => {
  const source = read("src/app/HomeClient.tsx");
  for (const id of [
    ...NAV_SECTIONS.map((s) => s.id),
    ...NAV_UTILITY_SECTIONS.map((u) => u.id),
  ]) {
    assert.match(source, new RegExp(`activeTab === ["']${id}["']`), `${id} has no render branch`);
  }
});

check("every declared pane has a translated label in EN/UZ/RU", () => {
  for (const locale of ["en", "uz", "ru"]) {
    const panes = messages(locale).navPanes;
    assert.ok(panes);
    for (const section of NAV_SECTIONS) {
      for (const pane of section.panes) {
        assert.ok(panes[pane.id], `${locale}.navPanes.${pane.id} missing`);
        assert.notEqual(String(panes[pane.id]).trim(), "");
      }
    }
  }
});

check("pane deep links, legacy aliases and utility ids all resolve", () => {
  for (const section of NAV_SECTIONS) {
    for (const pane of section.panes) {
      const target = resolveNavTarget(`${section.id}/${pane.id}`);
      assert.deepEqual(target, { section: section.id, pane: pane.id, utility: false });
    }
  }
  for (const [alias, expected] of Object.entries(LEGACY_SECTION_ALIASES)) {
    const target = resolveNavTarget(alias);
    assert.ok(target, `alias ${alias} did not resolve`);
    assert.equal(target!.utility, false);
    assert.ok(NAV_DESTINATION_IDS.includes(target!.section), `${alias} -> ${target!.section} is not a destination`);
    assert.equal(target!.pane, expected.pane ?? NAV_SECTIONS.find((s) => s.id === target!.section)?.panes[0]?.id ?? null);
  }
  for (const utility of NAV_UTILITY_SECTIONS) {
    assert.deepEqual(resolveNavTarget(utility.id), { section: utility.id, pane: null, utility: true });
  }
  assert.equal(resolveNavTarget("definitely-not-a-section"), null);
  assert.ok(LINKABLE_SECTION_IDS.includes("dashboard"));
  assert.ok(LINKABLE_SECTION_IDS.includes("chancing"));
});

check("public university / scholarship landing pages stay login-free", () => {
  for (const path of [
    "src/app/universities/page.tsx",
    "src/app/universities/[id]/page.tsx",
    "src/app/scholarships/page.tsx",
    "src/app/scholarships/[id]/page.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /requireAuth|getSession\s*\(|auth\s*\(\s*\)/);
    assert.doesNotMatch(source, /router\.(push|replace)\(["']\/dashboard/);
    for (const match of source.matchAll(/redirect\s*\(\s*[`"']([^`"']+)/g)) {
      assert.match(match[1], /^\/(?:universities|scholarships)(?:\?|$)/, `${path} redirects outside the public catalogue`);
    }
    assert.doesNotMatch(source, /redirect\s*\(\s*[`"']\/(?:login|signin|dashboard)/i);
  }
  assert.equal(existsSync(join(ROOT, "middleware.ts")), false);
  assert.equal(existsSync(join(ROOT, "src/middleware.ts")), false);
  // Next 16 renamed middleware to proxy.ts. It sets locale/CSP/CSRF headers;
  // it must not become a global login gate for public catalogue landing pages.
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /matcher:/);
  assert.doesNotMatch(proxy, /requireAuth|getSession\s*\(|auth\s*\(\s*\)/);
  assert.doesNotMatch(proxy, /redirect\s*\(\s*[`"']\/(?:login|signin|dashboard)/i);
});

check("Telegram Mini App entry and deep-link landing routes still exist", () => {
  assert.match(read("src/app/tg/page.tsx"), /telegram-web-app\.js/);
  for (const path of [
    "src/app/tg/page.tsx",
    "src/app/scholarships/[id]/page.tsx",
    "src/app/universities/[id]/page.tsx",
    "src/app/parent/[token]/page.tsx",
    "src/app/certificates/[code]/page.tsx",
  ]) {
    assert.ok(existsSync(join(ROOT, path)), `${path} missing`);
  }
});

check("known design-system fixes are preserved", () => {
  assert.match(read("src/components/DailyStreakCard.tsx"), /variant="unstyled"/);
  assert.match(read("src/components/landing/PremiumFAQ.tsx"), /variant="unstyled"/);
  assert.match(read("src/components/landing/PremiumTestimonials.tsx"), /variant="unstyled"/);
  for (const path of [
    "src/components/landing/PremiumFAQ.tsx",
    "src/components/landing/PremiumTestimonials.tsx",
    "src/components/DailyStreakCard.tsx",
    "src/app/page.tsx",
    "src/app/features/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
  ]) {
    assert.doesNotMatch(read(path), /<img\b/);
  }
});

check("public features copy does not promise a personal admission probability", () => {
  for (const locale of ["en", "uz", "ru"]) {
    const source = read(`src/i18n/messages/${locale}.json`);
    assert.doesNotMatch(
      source,
      /We estimate your admission chance|We show (?:your|a) personal admission probability|qabul ehtimolini hisoblaydi|оцениваем шанс поступления/i
    );
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
