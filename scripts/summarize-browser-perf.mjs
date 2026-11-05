/** Archive measured samples, never manufacture a score or compare different conditions. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const median = (values) => {
  assert.equal(values.length, 3, "Use the same three cold-context repetitions");
  assert.ok(values.every((v) => Number.isFinite(v) && v >= 0));
  return [...values].sort((a, b) => a - b)[1];
};
const compare = (before, after) => ({ before, after, improvementPercent: before ? (before - after) / before * 100 : null });
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const directory = `data/performance/${date}`;
mkdirSync(directory, { recursive: true });
const profiles = {};
for (const profile of ["desktop", "mobile"]) {
  const before = read(`test-results/performance/before-${profile}.json`);
  const after = read(`test-results/performance/after-${profile}.json`);
  assert.equal(before.stage, "before"); assert.equal(after.stage, "after");
  assert.deepEqual(before.conditions, after.conditions, "Conditions must match");
  const metrics = Object.fromEntries(["ttfbMs", "fcpMs", "lcp", "cls", "blockingMs", "scriptDecodedBytes", "themeClickMs", "signInDialogMs", "signInShellMs"].map((key) => [key, compare(median(before.samples.map((s) => s[key])), median(after.samples.map((s) => s[key])))]));
  const expectedTargets = ["universities/search", "scholarships/browse", "universities/search"];
  for (const sample of [...before.samples, ...after.samples]) assert.deepEqual(sample.transitions.map((t) => t.target), expectedTargets);
  const transitions = [0, 1, 2].map((index) => ({ target: before.samples[0].transitions[index].target, revisit: index === 2, ...compare(median(before.samples.map((s) => s.transitions[index].readyMs)), median(after.samples.map((s) => s.transitions[index].readyMs))) }));
  profiles[profile] = { conditions: before.conditions, metrics, transitions };
  for (const stage of ["before", "after"]) copyFileSync(`test-results/performance/${stage}-${profile}.json`, `${directory}/${stage}-${profile}.json`);
}
const beforeBundle = read("test-results/performance/before-bundles.json").find((r) => r.route === "/");
const afterBundle = read(".next/diagnostics/route-bundle-stats.json").find((r) => r.route === "/");
const summary = { date, scope: "Local production-build Chromium measurements, not a production deployment/field-Web-Vitals or Lighthouse score", repetitionsPerProfilePerStage: 3, totalMeasuredRuns: 12, profiles, landingBuildJsBytes: compare(beforeBundle.firstLoadUncompressedJsBytes, afterBundle.firstLoadUncompressedJsBytes), limitations: ["Warm loopback backend and two-university disposable fixtures, not production load or geographic latency", "External origins blocked equally; CDN/image delivery is not measured", "4-second post-DCL observation before interactions; interactions are not timed at the first instant of navigation", "Shared-runner noise: report all medians, including unchanged/slower metrics", "Blocking sum is a fixed-window long-task proxy, not Lighthouse TBT; interactions are browser-driven timings, not field INP", "Sign-in is a static critical import; only the open dialog mounts. Returning-session and immediate sub-two-second tap timings are not separate benchmark profiles"] };
const files = ["src/app/HomeClient.tsx", "src/app/globals.css", "src/components/LandingPage.tsx", "src/components/motion/PageTransition.tsx", "src/components/ui/PanelSkeleton.tsx", "src/components/SiteTracker.tsx", "src/components/SmartTimelineCalendar.tsx", "src/lib/idle.ts", "e2e/performance.spec.ts", "scripts/run-browser-perf.mjs", "scripts/run-e2e.mjs", "playwright.config.ts", "package.json", "package-lock.json"];
writeFileSync(`${directory}/after-source.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  note: "Uncommitted post-optimization source fingerprints, not a clean HEAD build. Baseline was captured in the previously audited working tree before speed changes; no equivalent baseline source snapshot was recorded.",
  sha256: Object.fromEntries(files.map((file) => [file, createHash("sha256").update(readFileSync(file)).digest("hex")])),
}, null, 2) + "\n");
writeFileSync(`${directory}/comparison.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
