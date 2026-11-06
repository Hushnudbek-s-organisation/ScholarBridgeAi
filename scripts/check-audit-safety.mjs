/** Narrow source-contract guards for the audit harness and honest legal metadata. */
import assert from "node:assert/strict";
import yaml from "js-yaml";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
// The real workflow is auto-discovered under .github/workflows; the portable
// mirror is NOT. Its display name says so explicitly, so compare every OTHER
// key (env / on / jobs / steps) — command parity is what must never drift.
const activeCi = yaml.load(read(".github/workflows/ci.yml"));
const mirrorCi = yaml.load(read("ci/security-ci.yml"));
assert.match(String(mirrorCi.name), /not auto-discovered/i, "mirror must be labelled as not auto-discovered");
const { name: _activeName, ...activeRest } = activeCi;
const { name: _mirrorName, ...mirrorRest } = mirrorCi;
assert.deepEqual(mirrorRest, activeRest, "active and portable CI workflows must stay aligned on every executable key");
const setup = read("e2e/global-setup.ts");
assert.match(setup, /const serverEnv = \{ \.\.\.env, PORT:/, "do not merge unsanitized process.env back into the server");
assert.doesNotMatch(setup, /const serverEnv = \{ \.\.\.process\.env/);
assert.match(setup, /env\.DATABASE_URL = databaseUrl/);
assert.match(setup, /env\.SESSION_SECRET = "scholarbridge-e2e-local/);
assert.match(setup, /env\.APP_PLAIN_HTTP = "1"/);
assert.match(setup, /isolatedServiceEnvironment\(process.env, root\)/);
assert.match(read("e2e/isolated-env.ts"), /SMTP_/);
const config = read("playwright.config.ts");
assert.match(config, /video: process\.env\.E2E_VIDEO === "1" \? "retain-on-failure" : "off"/);
assert.match(config, /trace: "retain-on-failure"/);
assert.match(config, /screenshot: "only-on-failure"/);
const runner = read("scripts/run-e2e.mjs");
assert.match(runner, /al2023\.tar\.br/);
assert.match(runner, /finally \{/);
assert.match(runner, /rmSync\(bundledRuntimeDir/);
assert.match(read("src/components/telegram/MiniApp.tsx"), /const \[ready, setReady\] = useState<Lang \| null>\(null\)/, "first Mini App render must not depend on warm global dictionary state");
assert.match(runner, /chromium.args.filter/);
assert.match(runner, /"--single-process", "--disable-web-security"/);
for (const path of ["src/app/privacy/page.tsx", "src/app/terms/page.tsx"]) {
  const source = read(path);
  assert.doesNotMatch(source, /new Date\(\)\.toLocaleDateString/);
  assert.match(source, /<time dateTime="\d{4}-\d{2}-\d{2}">/);
  assert.match(source, /lang="en"/);
}
assert.doesNotMatch(read("src/app/certificates/[code]/verify-view.tsx"), /decodeURIComponent\(code\)/);
const privacy = read("src/app/privacy/page.tsx");
assert.match(privacy, /sb_session/);
assert.match(privacy, /pseudonymous/);
assert.doesNotMatch(privacy, /simply opts you out|essential localStorage is needed to stay signed in/);
console.log("Audit harness and legal-metadata source contracts passed (27 assertions); these do not replace browser or legal review.");
