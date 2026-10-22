import EmbeddedPostgres from "embedded-postgres";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { FullConfig } from "@playwright/test";

function assertLoopbackPortFree(port: number): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", (error) => reject(new Error(`E2E port ${port} is not free on loopback: ${error.message}`)));
    server.listen(port, "127.0.0.1", () => server.close((error) => error ? reject(error) : resolvePromise()));
  });
}

function waitForExit(child: ChildProcess, timeoutMs = 8_000): Promise<void> {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolvePromise();
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolvePromise();
    }, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

export default async function globalSetup(_config: FullConfig) {
  const root = process.cwd();
  const dbPort = Number(process.env.E2E_DATABASE_PORT);
  const appPort = Number(process.env.E2E_PORT);
  if (!Number.isSafeInteger(dbPort) || dbPort < 1024 || !Number.isSafeInteger(appPort) || appPort < 1024) {
    throw new Error("Run E2E through `npm run test:e2e`; it allocates isolated loopback ports.");
  }
  await assertLoopbackPortFree(dbPort);
  await assertLoopbackPortFree(appPort);

  const workDir = mkdtempSync(join(tmpdir(), `scholarbridge-e2e-${process.pid}-`));
  const databaseDir = join(workDir, "postgres");
  const fixtureFile = join(workDir, "fixtures.json");
  const databaseName = `sb_e2e_${process.pid}`;
  const databaseUrl = `postgresql://e2e:e2e-only@127.0.0.1:${dbPort}/${databaseName}`;
  const embeddedLibrary = resolve(root, "node_modules/@embedded-postgres/linux-x64/native/lib");
  const env: Record<string, string | undefined> = { ...process.env };
  // These tests are strictly local and must never inherit a developer's paid
  // provider credentials or external service keys.
  for (const key of Object.keys(env)) {
    if (/(API_KEY|APIKEY|OPENROUTER|OPENAI|ANTHROPIC|GEMINI|GOOGLE_GENERATIVE|GROQ|MISTRAL|DEEPSEEK|COHERE|XAI|AI_PROVIDER|TELEGRAM_BOT_TOKEN|PAYME|CLICK_SECRET)/i.test(key)) {
      delete env[key];
    }
  }
  env.DATABASE_URL = databaseUrl;
  env.SESSION_SECRET = "scholarbridge-e2e-local-session-secret-only-2026";
  env.APP_URL = `http://127.0.0.1:${appPort}`;
  const nextMode = process.env.E2E_NEXT_MODE === "start" ? "start" : "dev";
  Reflect.set(env, "NODE_ENV", nextMode === "start" ? "production" : "development");
  env.NEXT_TELEMETRY_DISABLED = "1";
  env.LD_LIBRARY_PATH = [embeddedLibrary, env.LD_LIBRARY_PATH].filter(Boolean).join(":");
  env.E2E_FIXTURE_FILE = fixtureFile;

  let pg: EmbeddedPostgres | null = null;
  let server: ChildProcess | null = null;
  let serverOutput = "";
  const cleanup = async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      server.kill("SIGTERM");
      await waitForExit(server);
    }
    if (pg) {
      try { await pg.stop(); } catch { /* cleanup continues; temp data is disposable */ }
      pg = null;
    }
    rmSync(workDir, { recursive: true, force: true });
  };

  try {
    pg = new EmbeddedPostgres({
      databaseDir,
      user: "e2e",
      password: "e2e-only",
      port: dbPort,
      persistent: false,
      onLog: () => {},
      onError: (error) => { serverOutput += `[embedded-postgres] ${String(error)}\n`; },
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(databaseName);
    console.log(`E2E database: disposable embedded PostgreSQL on 127.0.0.1:${dbPort}/${databaseName}`);

    execFileSync(process.execPath, [join(root, "node_modules/drizzle-kit/bin.cjs"), "push", "--force"], {
      cwd: root,
      env: env as NodeJS.ProcessEnv,
      stdio: "inherit",
      timeout: 240_000,
    });
    execFileSync(process.execPath, [join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/e2e/seed-fixtures.ts"], {
      cwd: root,
      env: env as NodeJS.ProcessEnv,
      stdio: "inherit",
      timeout: 120_000,
    });

    const serverEnv = { ...process.env, ...env, PORT: String(appPort) };
    Reflect.set(serverEnv, "NODE_ENV", nextMode === "start" ? "production" : "development");
    const appServer = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), nextMode, "--hostname", "127.0.0.1", "--port", String(appPort)], {
      cwd: root,
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server = appServer;
    appServer.stdout?.on("data", (chunk: Buffer) => { serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000); });
    appServer.stderr?.on("data", (chunk: Buffer) => { serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000); });

    const healthUrl = `http://127.0.0.1:${appPort}/api/health`;
    const deadline = Date.now() + 120_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (appServer.exitCode !== null || appServer.signalCode !== null) break;
      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
        if (response.status === 200 && (await response.json()).ok === true) {
          ready = true;
          break;
        }
      } catch { /* wait for Next dev to compile the health route */ }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
    if (!ready) throw new Error(`E2E server did not become healthy at ${healthUrl}.\n${serverOutput}`);
    process.env.E2E_FIXTURE_FILE = fixtureFile;
    console.log(`E2E server ready: ${healthUrl}; external AI credentials removed from its environment.`);
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
