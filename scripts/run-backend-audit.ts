/** Offline/disposable backend audit. Never inherit live DB/provider credentials. */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isolatedServiceEnvironment } from "../e2e/isolated-env";

const env = isolatedServiceEnvironment(process.env, process.cwd());
env.DATABASE_URL = "postgresql://blocked:blocked@127.0.0.1:1/backend_audit_only";
env.SESSION_SECRET = "backend-audit-disposable-only-session-secret";
Reflect.set(env, "NODE_ENV", "test");
env.NEXT_TELEMETRY_DISABLED = "1";
mkdirSync("test-results/backend", { recursive: true });
let failed = false;
for (const name of ["backend-resilience", "dashboard-cache", "security", "ai-settings", "integration", "payments"]) {
  const file = `scripts/check-${name}.ts`;
  const result = spawnSync(process.execPath, [join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), file], {
    env, timeout: 300_000, maxBuffer: 16 * 1024 * 1024, encoding: "utf8",
  });
  writeFileSync(`test-results/backend/${name}.log`, `${result.stdout ?? ""}\n${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`);
  const ok = result.status === 0 && !result.error;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}; log: test-results/backend/${name}.log`);
  if (!ok) { failed = true; console.log((result.stderr || result.stdout || "").slice(-3000)); }
}
process.exitCode = failed ? 1 : 0;
