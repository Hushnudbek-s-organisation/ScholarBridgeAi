/**
 * Boot the engine exactly as the installed app does, on the OS that built the
 * installer, and prove it answers.
 *
 *   node scripts/check-desktop-engine.mjs desktop/release/linux-unpacked
 *   node scripts/check-desktop-engine.mjs "desktop/release/mac-arm64/ScholarBridge.app/Contents"
 *
 * The argument is the folder holding `resources/` (or the app's `Contents`
 * folder on macOS). The script uses the runtime and the server bundle from
 * THAT folder — not from the repository — which is what caught nothing at all
 * before the Windows build failed on a user's machine with "the server stopped
 * while starting (code 1)".
 *
 * Exit 0 on success; on failure it prints the engine's own output and exits 1
 * so the workflow can annotate it.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const appDir = process.argv[2];
if (!appDir) {
  console.error("usage: node scripts/check-desktop-engine.mjs <unpacked app dir>");
  process.exit(2);
}

const resources = path.resolve(appDir, "resources");
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

// Prefer the runtime the app ships; fall back to the runner's Node.
const command = fs.existsSync(bundledNode) ? bundledNode : process.execPath;
console.log(`runtime: ${command}${fs.existsSync(bundledNode) ? " (bundled)" : " (runner)"}`);

const port = Number(process.env.ENGINE_TEST_PORT || 4599);
const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  PORT: String(port),
  HOSTNAME: "127.0.0.1",
  // The engine needs the variable to exist; no database is contacted for a
  // health check, and the real one is created by the app on first launch.
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://build:build@127.0.0.1:1/scholarbridge",
  SESSION_SECRET: "engine-smoke-test-secret-that-is-long-enough-000000",
  APP_PLAIN_HTTP: "1",
  SEED_ON_REQUEST: "off",
};
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(command, [path.join(serverDir, "server.js")], {
  cwd: serverDir,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

const output = [];
const remember = (chunk, tag) => {
  for (const line of String(chunk).split(/\r?\n/)) {
    if (!line.trim()) continue;
    output.push(`${tag}: ${line}`);
    if (output.length > 200) output.shift();
  }
};
child.stdout.on("data", (chunk) => remember(chunk, "out"));
child.stderr.on("data", (chunk) => remember(chunk, "err"));

let exit = null;
child.on("exit", (code, signal) => {
  exit = { code, signal };
});

const giveUp = (reason) => {
  console.error(`\n✖ ${reason}`);
  console.error(output.slice(-25).join("\n") || "(the engine produced no output)");
  try {
    child.kill("SIGKILL");
  } catch {
    /* already gone */
  }
  process.exit(1);
};

const deadline = Date.now() + 120_000;
let healthy = false;
while (Date.now() < deadline) {
  if (exit) giveUp(`the engine exited (code ${exit.code}, signal ${exit.signal}) before answering`);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2_000) });
    if (res.ok) {
      healthy = true;
      break;
    }
  } catch {
    /* not up yet */
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (!healthy) giveUp("the engine never answered /api/health");

// The landing page must render too — a server that starts but cannot serve a
// page is just as broken for the user.
const page = await fetch(`http://127.0.0.1:${port}/`, { headers: { accept: "text/html" } }).catch(() => null);
const html = page ? await page.text() : "";
child.kill("SIGTERM");
await new Promise((resolve) => setTimeout(resolve, 1_500));

if (!page || !page.ok || !/ScholarBridge/i.test(html)) {
  giveUp(`the landing page did not render (status ${page ? page.status : "no response"})`);
}

console.log(`✓ the packaged engine starts, answers /api/health and serves the app (${process.platform}/${process.arch})`);
process.exit(0);
