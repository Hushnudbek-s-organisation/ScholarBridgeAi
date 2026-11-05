import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import { isolatedServiceEnvironment } from "../e2e/isolated-env";
const root = mkdtempSync(join(tmpdir(), "sb-isolated-env-contract-"));
try {
  writeFileSync(join(root, ".env.local"), 'OPENAI_API_KEY=canary-from-file\nSMTP_HOST=canary-smtp\nexport STRIPE_SECRET_KEY="canary-payment"\n');
  writeFileSync(join(root, ".env.example"), '#TELEGRAM_BOT_TOKEN=canary-example\n');
  const source = { NODE_ENV: "test" as const, PATH: "/usr/bin", GROQ_API_KEY: "canary-inherited", SMTP_PASSWORD: "canary-password", SESSION_SECRET: "canary-session", DATABASE_URL: "postgresql://inherited/never-use" };
  const env = isolatedServiceEnvironment(source, root);
  for (const key of ["OPENAI_API_KEY", "SMTP_HOST", "STRIPE_SECRET_KEY", "TELEGRAM_BOT_TOKEN", "GROQ_API_KEY", "SMTP_PASSWORD", "SESSION_SECRET", "DATABASE_URL"]) assert.equal(env[key], "", `must blank ${key}`);
  config({ path: join(root, ".env.local"), processEnv: env, quiet: true });
  for (const key of ["OPENAI_API_KEY", "SMTP_HOST", "STRIPE_SECRET_KEY"]) assert.equal(env[key], "", `dotenv must not restore ${key}`);
  assert.equal(env.PATH, "/usr/bin");
  assert.equal(env.NODE_ENV, "test");
  assert.equal(source.GROQ_API_KEY, "canary-inherited", "do not mutate the parent's environment");
  env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5521/disposable";
  assert.equal(new URL(env.DATABASE_URL).hostname, "127.0.0.1");
  console.log("Isolated-service environment: 15 assertions passed, including dotenv non-restoration and parent preservation.");
} finally { rmSync(root, { recursive: true, force: true }); }
