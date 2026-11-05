/** Runs formerly manual fixture-writing checks on a disposable stack only. */
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import globalSetup from "../e2e/global-setup";
import { isolatedServiceEnvironment } from "../e2e/isolated-env";

async function port(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("No local port"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}
async function main() {
  process.env.E2E_NEXT_MODE = "start";
  const databasePort = await port();
  let appPort = await port();
  while (appPort === databasePort) appPort = await port();
  process.env.E2E_DATABASE_PORT = String(databasePort);
  process.env.E2E_PORT = String(appPort);
  const cleanup = await globalSetup({} as FullConfig);
  try {
    const url = process.env.E2E_DATABASE_URL;
    if (!url || new URL(url).hostname !== "127.0.0.1") throw new Error("Disposable local DB is required");
    for (const name of ["test:provenance", "test:channel-e2e"]) {
      const env = { ...isolatedServiceEnvironment(process.env, process.cwd()), DATABASE_URL: url, PROVENANCE_APP_URL: `http://127.0.0.1:${appPort}` };
      const result = spawnSync("npm", ["run", name], { env, stdio: "inherit", timeout: 180_000 });
      if (result.error) throw result.error;
      if (result.status !== 0) { process.exitCode = result.status ?? 1; return; }
    }
  } finally { await cleanup(); }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
