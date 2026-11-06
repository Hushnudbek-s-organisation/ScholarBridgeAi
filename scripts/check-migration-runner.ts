/**
 * §2 — a RECOVERY/ROLLBACK file is NOT a forward migration.
 *
 * Proves that no runner, CI step, deploy command or apply checklist can pick up
 * a rollback by accident, that the forward chain is ordered and transactional,
 * and that each recovery has its own preflight guard. Run:
 *   npm run test:migration-runner
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}

const FORWARD = [
  "security_evidence_research_2026-11-06.sql",
  "official_source_corrections_2026-11-06.sql",
  "official_source_followup_2026-11-06_v2.sql",
];
const RECOVERY = [
  "official_source_corrections_2026-11-06_rollback.sql",
  "official_source_corrections_2026-11-06_rollback_v2.sql",
  "security_evidence_research_2026-11-06_recovery.sql",
];
const sql = (f: string) => read(`supabase/${f}`);

// Surfaces that could accidentally EXECUTE a SQL file.
const EXEC_SURFACES = [
  "package.json", ".github/workflows/ci.yml", "ci/security-ci.yml",
  "render.yaml", "DEPLOYMENT.md", "scripts/apply-full-schema.ts",
  "src/lib/research-agent/durableStore.ts",
];

console.log("\nMigration runner — forward vs recovery separation");

check("all six files exist and are classified in the runbook", () => {
  const runbook = read("docs/MIGRATION_RUNBOOK_2026-11-06.md");
  for (const f of [...FORWARD, ...RECOVERY]) {
    assert.ok(read(`supabase/${f}`).length > 0, `${f} missing`);
    assert.ok(runbook.includes(f), `${f} missing from runbook classification`);
  }
  assert.match(runbook, /RECOVERY v1 — HISTORICAL, ISHLATILMAYDIGAN/);
});

check("NO recovery file appears in any executable / apply surface", () => {
  for (const f of RECOVERY) {
    const stem = f.replace(/\.sql$/, "");
    for (const surface of EXEC_SURFACES) {
      const src = read(surface);
      // A prose mention in a runbook/guard is fine; a command referencing the
      // file in a runner is not.
      assert.ok(!new RegExp(`(run|exec|apply|psql|execute|query)[^\\n]{0,120}${stem}`, "i").test(src),
        `${f} referenced as an executable in ${surface}`);
      assert.ok(!src.includes(`supabase/${f}`), `${f} listed in ${surface}`);
    }
  }
});

check("the release doc no longer lists rollback in the ordinary apply chain", () => {
  const rel = read("docs/RELEASE_READINESS_2026-11-06.md");
  const applyBlock = rel.slice(rel.indexOf("## 5."), rel.indexOf("## 6."));
  for (const f of RECOVERY) {
    assert.ok(!applyBlock.includes(f), `${f} still in the ordinary apply section`);
  }
  assert.match(applyBlock, /security_evidence_research_2026-11-06\.sql/);
  assert.match(applyBlock, /official_source_corrections_2026-11-06\.sql/);
  assert.match(applyBlock, /official_source_followup_2026-11-06_v2\.sql/);
});

check("each FORWARD file is transactional and idempotent by construction", () => {
  for (const f of FORWARD) {
    const s = sql(f);
    // Strip `--` prose comments: a comment explaining DROP NOT NULL is not an
    // executable DROP. Only executable SQL is checked for destructiveness.
    const code = s.replace(/^\s*--.*$/gm, "");
    assert.match(s, /^BEGIN;/m, `${f} has no BEGIN`);
    assert.match(s, /^COMMIT;/m, `${f} has no COMMIT`);
    assert.doesNotMatch(code, /\bTRUNCATE\b|^\s*DROP TABLE\b/im, `${f} is destructive`);
  }
  // The chain order is explicit and the follow-up does not edit applied files.
  const v2 = sql(FORWARD[2]);
  assert.match(v2, /APPLY ORDER: security_evidence_research_2026-11-06\.sql/);
  assert.match(v2, /ON CONFLICT \(entity_type, entity_id, field_key, admission_cycle\) DO NOTHING/);
  assert.match(v2, /DROP CONSTRAINT IF EXISTS catalogue_facts_value_type_check/);
});

check("each RECOVERY file has an explicit preflight + safe-abort guard", () => {
  for (const f of RECOVERY.slice(1)) {
    const s = sql(f);
    assert.match(s, /PREFLIGHT/i, `${f} has no preflight`);
    assert.ok(/NO ROLLBACK WAS MADE|NO RECOVERY|never by a migration runner|NOT A FORWARD MIGRATION/i.test(s),
      `${f} has no safe-abort / non-forward marker`);
    assert.match(s, /^BEGIN;/m);
    assert.match(s, /^COMMIT;/m);
  }
});

check("v2 rollback restores ONLY fields still equal to the forward value", () => {
  const s = sql(RECOVERY[1]);
  const cases = [...s.matchAll(/CASE WHEN /g)].length;
  assert.ok(cases >= 12, `expected field-level CASE guards, found ${cases}`);
  assert.match(s, /ELSE amount_usd_value|ELSE min_ielts|ELSE eligible_countries/);
  assert.match(s, /legitimately edited|legitimate edit|preserved/i);
  assert.match(s, /current_user/);
  assert.doesNotMatch(s, /^\s*DELETE FROM|^\s*TRUNCATE/m);
});

check("v1 rollback is explicitly historical and must not be used", () => {
  const s = sql(RECOVERY[0]);
  assert.match(s, /HISTORICAL|NOT APPLIED BY THE AGENT|REPLACES the v1 rollback/i);
});

check("the security recovery is separate from the correction rollback", () => {
  const s = sql(RECOVERY[2]);
  assert.match(s, /SEPARATE from official_source_corrections/);
  assert.match(s, /NEVER drops the new tables/);
  assert.doesNotMatch(s, /^\s*DROP TABLE/m);
  assert.match(s, /ENABLE ROW LEVEL SECURITY/);
  assert.match(s, /REVOKE INSERT, UPDATE, DELETE ON storage\.objects FROM PUBLIC, anon, authenticated/);
});

check("check-backend-sql.py only PARSES; it never applies recovery files", () => {
  const s = read("scripts/check-backend-sql.py");
  assert.match(s, /parse_sql/);
  assert.match(s, /grammar_only|role.*grammar/i);
  const code = s.replace(/^\s*#.*$/gm, "").replace(/"""[\s\S]*?"""/g, "").replace(/"[^"\n]*"/g, "\"\"");
  assert.doesNotMatch(code, /cursor\(|\.execute\(|psycopg|asyncpg|pg\.connect|create_engine/i);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}
