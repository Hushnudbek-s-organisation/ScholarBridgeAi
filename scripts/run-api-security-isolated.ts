import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import type { FullConfig } from "@playwright/test";
import globalSetup from "../e2e/global-setup";

function freeLoopbackPort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Failed to allocate loopback port"));
      server.close((error) => error ? reject(error) : resolvePromise(address.port));
    });
  });
}

async function main() {
  if (!existsSync(join(process.cwd(), ".next/BUILD_ID"))) throw new Error("Build the app first with `npm run build`; API audit intentionally uses next start, not next dev.");
  process.env.E2E_NEXT_MODE = "start";
  const [databasePort, appPort] = await Promise.all([freeLoopbackPort(), freeLoopbackPort()]);
  if (databasePort === appPort) throw new Error("Port allocator returned the same database and app port");
  process.env.E2E_DATABASE_PORT = String(databasePort);
  process.env.E2E_PORT = String(appPort);
  const cleanup = await globalSetup({} as FullConfig);
  try {
    const env: Record<string, string | undefined> = {
      ...process.env,
      API_BASE_URL: `http://127.0.0.1:${appPort}`,
    };
    for (const key of Object.keys(env)) {
      if (/(API_KEY|APIKEY|OPENROUTER|OPENAI|ANTHROPIC|GEMINI|GOOGLE_GENERATIVE|GROQ|MISTRAL|DEEPSEEK|COHERE|XAI|AI_PROVIDER|TELEGRAM_BOT_TOKEN|PAYME|CLICK_SECRET)/i.test(key)) {
        delete env[key];
      }
    }
    const result = spawnSync(process.execPath, [join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "scripts/check-api-anonymous.ts"], {
      cwd: process.cwd(),
      env: env as NodeJS.ProcessEnv,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    await cleanup();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
