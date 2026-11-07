import EmbeddedPostgres from "embedded-postgres";
import { isolatedServiceEnvironment } from "./isolated-env";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync, mkdirSync, appendFileSync, writeFileSync } from "node:fs";
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
  const env = isolatedServiceEnvironment(process.env, root);
  env.DATABASE_URL = databaseUrl;
  env.SESSION_SECRET = "scholarbridge-e2e-local-session-secret-only-2026";
  env.APP_PLAIN_HTTP = "1"; // Disposable loopback HTTP server, including next start.
  env.APP_URL = `http://127.0.0.1:${appPort}`;
  const nextMode = process.env.E2E_NEXT_MODE === "start" ? "start" : "dev";
  Reflect.set(env, "NODE_ENV", nextMode === "start" ? "production" : "development");
  env.NEXT_TELEMETRY_DISABLED = "1";
  env.LD_LIBRARY_PATH = [embeddedLibrary, env.LD_LIBRARY_PATH].filter(Boolean).join(":");
  env.E2E_FIXTURE_FILE = fixtureFile;
  env.E2E_CONTINUATION_SCHEMA=process.env.E2E_CONTINUATION_SCHEMA??(process.env.PERF_STAGE?"0":"1");

  let pg: EmbeddedPostgres | null = null;
  let server: ChildProcess | null = null;
  let serverOutput = "";
  const safeFailureFile=resolve(root,"test-results/e2e-safe-failures.jsonl");
  mkdirSync(resolve(root,"test-results"),{recursive:true});writeFileSync(safeFailureFile,"");
  let diagnosticBuffer="";
  const recordSafeFailures=(chunk:Buffer)=>{
    diagnosticBuffer+=chunk.toString();
    const lines=diagnosticBuffer.split("\n");diagnosticBuffer=lines.pop()?.slice(-2000)??"";
    for(const line of lines){
      if(!line.startsWith("[journey-failure] ")||line.length>1000)continue;
      try{
        const data=JSON.parse(line.slice("[journey-failure] ".length));
        // Persist ONLY the fixed non-sensitive taxonomy, never raw server logs.
        if(!/^[0-9a-f-]{36}$/.test(data.requestId)||!["snapshot_changed","database_auth","database_transient","schema_unavailable","internal"].includes(data.category))continue;
        const where=typeof data.where==="string"&&/^[a-zA-Z/ -]{1,100}$/.test(data.where)?data.where:"route";
        const kind=["TypeError","RangeError","CacheRevisionChangedError","DrizzleQueryError","Error"].includes(data.kind)?data.kind:"Error";
        const dbCode=/^(?:[0-9A-Z]{5}|other)$/.test(data.dbCode??"")?data.dbCode:"other";
        appendFileSync(safeFailureFile,JSON.stringify({requestId:data.requestId,category:data.category,where,kind,dbCode})+"\n");
      }catch{/* Not one of our structured diagnostics; never persist it. */}
    }
  };
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

    const serverEnv = { ...env, PORT: String(appPort), NODE_ENV: nextMode === "start" ? "production" as const : "development" as const };
    const artifact=process.env.E2E_BUILT_ARTIFACT_DIR;
    if(artifact&&nextMode!=="start")throw new Error("Archived build E2E requires production start mode");
    const serverArgs=artifact?[join(root,"scripts/e2e/start-built.mjs"),artifact]:[join(root, "node_modules/next/dist/bin/next"), nextMode, "--hostname", "127.0.0.1", "--port", String(appPort)];
    const appServer = spawn(process.execPath, serverArgs, {
      cwd: root,
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server = appServer;
    appServer.stdout?.on("data", (chunk: Buffer) => { serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000); });
    appServer.stderr?.on("data", (chunk: Buffer) => { recordSafeFailures(chunk);serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000); });

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
    process.env.E2E_DATABASE_URL = databaseUrl;
    console.log(`E2E server ready: ${healthUrl}; external AI credentials removed from its environment.`);
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
