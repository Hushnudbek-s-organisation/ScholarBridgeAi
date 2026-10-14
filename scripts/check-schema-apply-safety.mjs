import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const applyScript = join(root, "scripts", "apply-full-schema.ts");

function invokeApply(acknowledgment, databaseUrl) {
  return spawnSync(process.execPath, [tsxCli, applyScript], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SCHOLARBRIDGE_ALLOW_FULL_SCHEMA_APPLY: acknowledgment,
      DATABASE_URL: databaseUrl,
    },
  });
}

const unapproved = invokeApply("", "postgresql://ci:ci@127.0.0.1:1/should_not_connect");
assert.equal(unapproved.error, undefined, unapproved.error?.message);
assert.equal(unapproved.status, 2, `${unapproved.stdout}\n${unapproved.stderr}`);
assert.match(`${unapproved.stdout}\n${unapproved.stderr}`, /Refusing to apply full_schema\.sql/i);
assert.match(`${unapproved.stdout}\n${unapproved.stderr}`, /No database connection was opened/i);
assert.doesNotMatch(`${unapproved.stdout}\n${unapproved.stderr}`, /ECONNREFUSED|applied supabase\/full_schema\.sql/i);

const approvedButUnconfigured = invokeApply("YES", "");
assert.equal(approvedButUnconfigured.error, undefined, approvedButUnconfigured.error?.message);
assert.equal(approvedButUnconfigured.status, 2, `${approvedButUnconfigured.stdout}\n${approvedButUnconfigured.stderr}`);
assert.match(`${approvedButUnconfigured.stdout}\n${approvedButUnconfigured.stderr}`, /DATABASE_URL is required/i);
assert.doesNotMatch(`${approvedButUnconfigured.stdout}\n${approvedButUnconfigured.stderr}`, /ECONNREFUSED|applied supabase\/full_schema\.sql/i);

console.log("PASS: full_schema apply refuses without explicit acknowledgment and never connects in the refusal cases.");
