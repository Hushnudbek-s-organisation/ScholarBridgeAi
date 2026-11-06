/**
 * Build/typecheck gates + CI auto-discovery guard (§12).
 *
 * Two things the report left unresolved:
 *  1. `typescript.ignoreBuildErrors: true` was a LITERAL, so a direct
 *     `npx next build` (bypassing npm's `prebuild`) could ship TypeScript
 *     errors unchecked. It is now conditional on `npm_lifecycle_event=build`.
 *  2. `ci/security-ci.yml` sits OUTSIDE `.github/workflows/`, so GitHub Actions
 *     never auto-runs it. It is explicitly a portable mirror whose commands are
 *     all enforced by the one auto-discovered workflow. This guard proves that
 *     parity so no security gate can silently vanish.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const stripComments = (s: string) => s.replace(/^\s*#.*$/gm, "").replace(/\/\/[^\n]*/g, " ");

const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
const nextConfig = read("next.config.ts");
const render = read("render.yaml");
const desktop = read("scripts/build-desktop.mjs");
const ci = read(".github/workflows/ci.yml");
const mirror = read("ci/security-ci.yml");

console.log("\nBuild gates + CI auto-discovery");

// ---- 1. ignoreBuildErrors is NOT a bypass ----------------------------------
check("ignoreBuildErrors is conditional on the npm build lifecycle, never literal true", () => {
  assert.doesNotMatch(nextConfig, /ignoreBuildErrors:\s*true\b/, "a literal true is a deploy bypass");
  assert.match(nextConfig, /ignoreBuildErrors:\s*process\.env\.npm_lifecycle_event === ["']build["']/);
});

check("the npm build lifecycle has a hard prebuild typecheck gate", () => {
  assert.equal(pkg.scripts.prebuild, "npm run typecheck");
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
});

check("CI runs an explicit standalone typecheck (not only the build)", () => {
  assert.match(ci, /npm run typecheck/);
  assert.match(ci, /lint:baseline/);
  assert.match(mirror, /npm run typecheck/, "mirror keeps the same gate");
});

check("a DIRECT next build cannot skip typecheck", () => {
  // With npm_lifecycle_event absent, `ignoreBuildErrors` evaluates false and
  // Next runs its own TS pass. Prove the expression is a real boolean and not
  // a hardcoded string/flag that ignores the environment.
  const expr = /ignoreBuildErrors:\s*process\.env\.npm_lifecycle_event === ["']build["']/.exec(nextConfig)?.[0] ?? "";
  assert.ok(expr.includes("process.env"), "the flag must read the environment at config load");
});

// ---- 2. Every real build path goes through npm run build -------------------
check("Render deploy uses npm run build (prebuild typecheck runs first)", () => {
  assert.match(render, /buildCommand:\s*npm ci && npm run build/);
  assert.match(render, /startCommand:\s*npm start/);
});

check("the desktop build invokes npm run build, not a raw next build", () => {
  // Strip comments: the prose mentions "next build" but the EXECUTABLE call is
  // run("npm", ["run", "build"]), which still triggers prebuild.
  const code = stripComments(desktop);
  assert.match(code, /run\(\s*["']npm["']\s*,\s*\[\s*["']run["']\s*,\s*["']build["']\s*\]/);
  assert.doesNotMatch(code, /spawn.*next.*build|exec.*["']next build|run\(\s*["']npx["']\s*,\s*\[\s*["']next["']\s*,\s*["']build/);
});

check("CI Build step uses npm run build, so prebuild typecheck is enforced", () => {
  assert.match(ci, /"Build" npm run build/);
  assert.match(ci, /npm ci --no-audit --no-fund/);
});

check("no executable build script launches a raw next build", () => {
  // package.json's build script IS `next build`, but npm wraps it in the
  // lifecycle whose prebuild is the hard typecheck gate. Every OTHER caller
  // must go through `npm run build`, not spawn `next build` on its own.
  const callers = ["scripts/build-desktop.mjs", "scripts/build-mobile.mjs", "render.yaml"];
  const rawLaunch = /(?:spawn|exec|run)\([^\n]*["']next["'][^\n]*["']build["']|(?:^|\s)next build(?:\s|$)/;
  for (const f of callers) {
    if (!existsSync(join(process.cwd(), f))) continue;
    const code = stripComments(read(f));
    assert.doesNotMatch(code, rawLaunch, `${f} must not launch a raw next build`);
  }
});

// ---- 3. CI auto-discovery --------------------------------------------------
check("the auto-discovered workflow is inside .github/workflows", () => {
  assert.ok(existsSync(join(process.cwd(), ".github/workflows/ci.yml")));
  assert.match(ci, /^on:/m);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /branches:\s*\[main\]/);
});

check("the portable mirror is explicitly marked NOT auto-discovered", () => {
  // It lives in ci/, NOT in .github/workflows/, so GitHub never auto-loads it.
  assert.ok(existsSync(join(process.cwd(), "ci/security-ci.yml")));
  assert.match(mirror, /NOT AUTO-DISCOVERED/);
  assert.match(mirror, /\.github\/workflows\/ci\.yml/);
  assert.match(mirror, /^name: CI \(portable mirror — not auto-discovered\)/m);
});

check("every npm run / audit command in the mirror is enforced by the real workflow", () => {
  const commandsOf = (s: string) => new Set(
    [...s.matchAll(/npm (?:run [a-z0-9:_-]+|audit[^\s&|'"]*|ci[^\s&|'"]*)/g)].map((m) => m[0].replace(/\s+/g, " ").trim()),
  );
  const real = commandsOf(ci);
  const portable = commandsOf(mirror);
  const missing = [...portable].filter((c) => !real.has(c));
  assert.deepEqual(missing, [], `mirror commands missing from auto-discovered CI: ${missing.join(", ")}`);
});

check("all new behavior guards are wired into the auto-discovered P1 chain", () => {
  const guards = [
    "test:official-source-adapter", "test:cache-revision", "test:finance-unified",
    "test:typed-evidence", "test:review-queue", "test:review-queue-runtime", "test:evidence-render",
    "test:admission-probability", "test:build-gates",
    "test:observability", "test:research-runtime",
    "test:migration-runner", "test:migration-recovery", "test:feature-inventory:verify",
  ];
  for (const g of guards) {
    assert.match(ci, new RegExp(`npm run ${g}`), `${g} missing from .github/workflows/ci.yml`);
    assert.match(mirror, new RegExp(`npm run ${g}`), `${g} missing from portable mirror`);
    assert.ok(pkg.scripts[g], `${g} missing from package.json`);
  }
});

check("the perf budget threshold is NOT raised", () => {
  const perf = read("scripts/check-perf.ts");
  // The landing JS budget stays at the documented 1300 KiB ceiling.
  assert.match(perf, /1300/, "the <1300 KiB budget must remain");
  assert.doesNotMatch(perf, /1500|1600|2048/, "threshold must not be raised");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
