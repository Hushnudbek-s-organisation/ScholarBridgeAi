/**
 * Deployment-shape regression checks (offline, no build).
 *
 * They guard the two things that made a whole day of fixes invisible: the
 * production build ran type-checking a second time (out-of-memory on a small
 * instance → every deploy failed → the previous release kept serving), and
 * nothing in the app could say which commit was live.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const nextConfig = read("next.config.ts");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
const ci = read(".github/workflows/ci.yml");
const health = read("src/app/api/health/route.ts");

console.log("\nDeployment — build stays inside a small instance");

check("the build does not type-check (CI owns that)", () => {
  assert.match(nextConfig, /typescript:\s*\{\s*ignoreBuildErrors:\s*true\s*\}/, "typescript.ignoreBuildErrors must stay true");
  // …which is only safe while CI type-checks every pull request.
  assert.match(ci, /npm run typecheck/, "CI must run the typecheck step");
  assert.ok(pkg.scripts.typecheck, "package.json needs a typecheck script");
});

check("linting stays in CI, not in the build", () => {
  // Next 16 removed built-in ESLint integration, so the build has no lint pass
  // to disable — but the gate must still exist in CI.
  assert.equal(pkg.scripts.build, "next build", "the build script stays plain");
  assert.match(ci, /lint:baseline/, "CI must run the lint gate");
});

check("/api/health reports short, validated commit ids and nothing else", () => {
  for (const env of ["RENDER_GIT_COMMIT", "VERCEL_GIT_COMMIT_SHA"]) {
    assert.ok(health.includes(env), `health should read ${env}`);
  }
  assert.match(health, /\[0-9a-f\]\{7,40\}/i, "the SHA must be validated before it is echoed");
  assert.match(health, /\.slice\(0,\s*7\)/, "only the short SHA is exposed");
  // The probe must stay free of connection details.
  assert.ok(!/process\.env\.(DATABASE_URL|PG_[A-Z_]+)/.test(health), "health must not read or echo connection settings");
});

check("keepalive never hardcodes a site domain", () => {
  const wf = read(".github/workflows/keepalive.yml");
  assert.ok(wf.includes("vars.SITE_URL"), "keepalive reads the repository variable");
  assert.ok(!/https:\/\/[a-z0-9-]+\.(onrender\.com|vercel\.app)/i.test(wf), "no hardcoded host in the workflow");
});

check("the deployment doc explains the 'old code keeps serving' trap", () => {
  const docs = read("docs/GITHUB_SUPABASE.md");
  assert.match(docs, /commit/i, "docs must mention the commit field of /api/health");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
