/**
 * Feature inventory — preservation guard (§1, §15).
 *
 * `--snapshot` writes the CURRENT set of feature identifiers to
 * docs/feature-inventory-baseline.json. `--verify` (default) re-scans the tree
 * and compares; ANY missing page, API route/method, nav section, admin tab,
 * locale, query parameter or action endpoint is a hard failure. This is not a
 * file-hash check: visual/design edits must not change identifiers, while a
 * removed function must.
 *
 * Run: npm run test:feature-inventory
 *      npm run test:feature-inventory:snapshot   (only when adding NEW features)
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const BASELINE = "docs/feature-inventory-baseline.json";

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  const full = join(ROOT, dir);
  if (!existsSync(full)) return out;
  for (const name of readdirSync(full)) {
    const p = join(full, name);
    if (statSync(p).isDirectory()) out.push(...walk(relative(ROOT, p), ext));
    else if (name.endsWith(ext)) out.push(relative(ROOT, p));
  }
  return out.sort();
}

const ids = (src: string, re: RegExp): string[] =>
  [...new Set([...src.matchAll(re)].map((m) => m[1]).filter(Boolean))].sort();

function collect() {
  // 1. Public / authenticated pages.
  const pages = walk("src/app", "page.tsx")
    .map((f) => f.replace(/^src\/app/, "").replace(/\/page\.tsx$/, "").replace(/\/page\.tsx$/, "") || "/")
    .map((p) => p.replace(/\/$/, "") || "/")
    .sort();

  // 2. API routes AND their exported HTTP methods.
  const api: string[] = [];
  for (const f of walk("src/app/api", "route.ts")) {
    const path = f.replace(/^src\/app/, "").replace(/\/route\.ts$/, "");
    const src = read(f);
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]
      .filter((m) => new RegExp(`export (async )?(function|const) ${m}\\b`).test(src));
    for (const m of methods) api.push(`${m} ${path}`);
  }

  // 3. Navigation sections / sub-panes / utility screens.
  const nav = ids(read("src/lib/navSections.ts"), /\bid:\s*"([a-zA-Z0-9_-]+)"/g);

  // 4. Admin tabs.
  const adminSrc = read("src/components/AdminPanel.tsx");
  const admin = ids(adminSrc.slice(adminSrc.indexOf("const SECTIONS"), adminSrc.indexOf("const TAB_KEY")), /id:\s*"([a-zA-Z0-9_-]+)"/g);

  // 5. Locales + theme modes.
  const locales = walk("src/i18n/messages", ".json").map((f) => f.split("/").pop()!.replace(".json", "")).sort();
  const themeSrc = read("src/lib/theme.ts");
  const theme = ["light", "dark", "system"].filter((m) => themeSrc.includes(`"${m}"`)).sort();

  // 6. Query parameters / deep-link entry points that must keep working.
  const queryParams = new Set<string>();
  for (const f of [...walk("src/app", "page.tsx"), ...walk("src/app/api", "route.ts"), ...walk("src/components", ".tsx")]) {
    const src = read(f);
    for (const m of src.matchAll(/searchParams\.get\(\s*["']([\w-]+)["']\s*\)/g)) queryParams.add(`searchParams:${m[1]}`);
    for (const m of src.matchAll(/params\.get\(\s*["']([\w-]+)["']\s*\)/g)) queryParams.add(`param:${m[1]}`);
    for (const m of src.matchAll(/URLSearchParams[^;]{0,120}["']([\w-]+)["']/g)) queryParams.add(`query:${m[1]}`);
  }

  // 7. Named user actions / integrations (route path is the stable id).
  const categories: Record<string, string[]> = {
    save: [], compare: [], export: [], payment: [], telegram: [],
    research: [], refresh: [], reviewQueue: [], documents: [], applications: [],
    ai: [], profile: [], auth: [],
  };
  for (const entry of api) {
    const p = entry.split(" ").slice(1).join(" ");
    const key = (needle: RegExp, bucket: string) => { if (needle.test(p)) categories[bucket].push(entry); };
    key(/saved-|save/i, "save");
    key(/compare/i, "compare");
    key(/export/i, "export");
    key(/payment|billing|checkout|webhook/i, "payment");
    key(/telegram|channel|\/tg\b/i, "telegram");
    key(/research-agent/i, "research");
    key(/refresh/i, "refresh");
    key(/review-queue/i, "reviewQueue");
    key(/document|vault|essay|recommendation/i, "documents");
    key(/application/i, "applications");
    key(/\bai\b|chat|mentor|chancing|essay/i, "ai");
    key(/profile/i, "profile");
    key(/auth|login|logout|password|session|reset/i, "auth");
  }

  return {
    pages, api, nav, admin, locales, theme,
    queryParams: [...queryParams].sort(),
    categories: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.sort()])),
    counts: {
      pages: pages.length, api: api.length, nav: nav.length, admin: admin.length,
      locales: locales.length,
    },
  };
}

const mode = process.argv.includes("--snapshot") ? "snapshot" : "verify";
const current = collect();

if (mode === "snapshot") {
  writeFileSync(join(ROOT, BASELINE), JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`Feature inventory snapshot written: ${JSON.stringify(current.counts)}`);
  process.exit(0);
}

const baseline = JSON.parse(read(BASELINE)) as typeof current;
let failures = 0;
const diff = (label: string, before: string[], after: string[]) => {
  const missing = before.filter((x) => !after.includes(x));
  const added = after.filter((x) => !before.includes(x));
  if (missing.length) { failures++; console.log(`  ✗ ${label}: MISSING ${missing.join(", ")}`); }
  if (added.length) console.log(`  + ${label}: new ${added.join(", ")}`);
  if (!missing.length && !added.length) console.log(`  ✓ ${label}: ${before.length} preserved`);
};

console.log("\nFeature inventory — before/after preservation check");
diff("pages", baseline.pages, current.pages);
diff("API routes + methods", baseline.api, current.api);
diff("nav sections", baseline.nav, current.nav);
diff("admin tabs", baseline.admin, current.admin);
diff("locales", baseline.locales, current.locales);
diff("theme modes", baseline.theme, current.theme);
diff("query params", baseline.queryParams, current.queryParams);
for (const key of Object.keys(baseline.categories)) {
  diff(`actions:${key}`, baseline.categories[key] ?? [], current.categories[key] ?? []);
}
assert.ok(current.counts.pages >= baseline.counts.pages, "page count decreased");
assert.ok(current.counts.api >= baseline.counts.api, "API route/method count decreased");

console.log(`\n${failures} preservation failure(s)`);
if (failures) {
  console.error("A function was removed. Restore its entry point before shipping.");
  process.exitCode = 1;
}
