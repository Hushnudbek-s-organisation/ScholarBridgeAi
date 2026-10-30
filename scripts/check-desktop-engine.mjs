/**
 * Boot the engine exactly as the installed app does, from the folder the
 * installer produced — on the OS that built it.
 *
 *   node scripts/check-desktop-engine.mjs desktop/release/linux-unpacked
 *   node scripts/check-desktop-engine.mjs "desktop/release/mac-arm64/ScholarBridge.app/Contents"
 *   SMOKE_WITH_DATABASE=1 node scripts/check-desktop-engine.mjs <dir>
 *
 * The argument is the folder holding `resources/` (on macOS: the app's
 * `Contents` folder). Nothing is taken from the repository: the runtime and the
 * server bundle come from THAT package, which is what an installed app runs.
 *
 * Two phases:
 *   1. Always — spawn the engine with a placeholder database and require an
 *      HTTP answer. This is what catches a runtime/ABI mismatch or a missing
 *      module: the process used to die instantly with code 1 on Windows and
 *      nothing in CI noticed.
 *   2. `SMOKE_WITH_DATABASE=1` — the full boot path from boot.mjs (private
 *      PostgreSQL → schema → engine) and a rendered landing page.
 *
 * Exits 0 on success; on failure prints the engine's own output and exits 1.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: node scripts/check-desktop-engine.mjs <unpacked app dir>");
  process.exit(2);
}

const resources = path.resolve(root, "resources");
const serverDir = path.join(resources, "server");
const schemaPath = path.join(resources, "schema", "full_schema.sql");
const binary = process.platform === "win32" ? "node.exe" : "node";
const bundledNode = path.join(resources, "node", binary);

for (const required of [path.join(serverDir, "server.js"), schemaPath]) {
  if (!fs.existsSync(required)) {
    console.error(`✖ missing from the package: ${required}`);
    process.exit(1);
  }
}

const failures = [];
const collectOutput = () => {
  const output = [];
  const remember = (chunk, tag) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (!line.trim()) continue;
      output.push(`${tag}: ${line}`);
      if (output.length > 300) output.shift();
    }
  };
  return { output, remember };
};

// ---------------------------------------------------------------------------
// Phase 1 — the engine must survive and answer HTTP at all.
// ---------------------------------------------------------------------------
async function phaseSpawnOnly() {
  const command = fs.existsSync(bundledNode) ? bundledNode : process.execPath;
  console.log(`phase 1: spawning ${command}${fs.existsSync(bundledNode) ? " (bundled runtime)" : " (runner node — no bundled runtime!)"}`);
  if (!fs.existsSync(bundledNode)) {
    failures.push("resources/node is missing — the app would fall back to Electron's Node");
  }

  const port = Number(process.env.ENGINE_TEST_PORT || 4599);
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    // Placeholder: the health check will answer 503 without a database, which
    // is fine here — the point is that the process runs and serves HTTP.
    DATABASE_URL: "postgresql://build:build@127.0.0.1:1/scholarbridge",
    SESSION_SECRET: "engine-smoke-test-secret-that-is-long-enough-000000",
    APP_PLAIN_HTTP: "1",
    SEED_ON_REQUEST: "off",
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(command, [path.join(serverDir, "server.js")], { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
  const { output, remember } = collectOutput();
  child.stdout.on("data", (chunk) => remember(chunk, "out"));
  child.stderr.on("data", (chunk) => remember(chunk, "err"));

  let exit = null;
  child.on("exit", (code, signal) => {
    exit = { code, signal };
  });

  const deadline = Date.now() + 90_000;
  let answered = false;
  while (Date.now() < deadline) {
    if (exit) break;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2_000) });
      answered = true;
      console.log(`phase 1: engine answered HTTP ${res.status}`);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!answered) {
    failures.push(
      exit
        ? `the engine exited (code ${exit.code}, signal ${exit.signal}) before answering`
        : "the engine never answered HTTP"
    );
    console.error(output.slice(-25).join("\n") || "(the engine produced no output)");
  }
  try {
    child.kill("SIGTERM");
  } catch {
    /* already gone */
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
  try {
    child.kill("SIGKILL");
  } catch {
    /* already gone */
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — the whole boot path, including the private database.
// ---------------------------------------------------------------------------
async function phaseFullBoot() {
  console.log("phase 2: full boot (private database → schema → engine → landing page)");
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "scholarbridge-smoke-"));
  const { startLocalServer } = await import("../desktop/boot.mjs");
  let server;
  try {
    server = await startLocalServer({
      appDir: serverDir,
      dataDir,
      schemaPath,
      host: "127.0.0.1",
      port: Number(process.env.ENGINE_TEST_PORT || 4599) + 1,
      dbPort: Number(process.env.ENGINE_TEST_DB_PORT || 56432),
      warmUp: false,
      log: (line) => {
        if (process.env.SMOKE_VERBOSE === "1") console.log(`  ${line}`);
      },
    });
    const health = await fetch(`${server.url}/api/health`).then((res) => res.json());
    if (!health.ok) failures.push(`/api/health is not ok with a real database: ${JSON.stringify(health)}`);
    else console.log("phase 2: /api/health ok");

    const page = await fetch(server.url, { headers: { accept: "text/html" } });
    const html = await page.text();
    if (!page.ok || !/ScholarBridge/i.test(html)) failures.push(`the landing page did not render (status ${page.status})`);
    else console.log("phase 2: landing page rendered");
  } catch (error) {
    failures.push(`full boot failed: ${error && error.message}`);
  } finally {
    if (server) await server.stop().catch(() => {});
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

await phaseSpawnOnly();
if (process.env.SMOKE_WITH_DATABASE === "1") {
  await phaseFullBoot();
} else {
  console.log("phase 2 skipped (SMOKE_WITH_DATABASE is not 1)");
}

if (failures.length) {
  console.error(`\n✖ packaged engine check FAILED on ${process.platform}/${process.arch}:`);
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log(`\n✓ the packaged engine starts and serves the app (${process.platform}/${process.arch})`);
