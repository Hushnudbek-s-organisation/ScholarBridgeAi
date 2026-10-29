/**
 * Build the ScholarBridge desktop app.
 *
 *   node scripts/build-desktop.mjs              # prepare the server + installer
 *   node scripts/build-desktop.mjs --no-package # only prepare .next/standalone
 *   node scripts/build-desktop.mjs --skip-build # reuse the existing build
 *
 * What it does:
 *   1. `next build` with NEXT_OUTPUT_STANDALONE=1 (self-contained server), so
 *      the installer does not need Node.js or npm on the user's machine.
 *   2. copies `public/` and `.next/static/` into the standalone folder — Next
 *      leaves those out of the standalone output on purpose.
 *   3. hands the result to electron-builder in `desktop/`, which bundles
 *      `.next/standalone` + `supabase/full_schema.sql` as app resources.
 *
 * Needs DATABASE_URL (build-time page-data collection reads the database) and
 * `desktop/node_modules` (`cd desktop && npm install`).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(repoRoot, ".next", "standalone");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const packageOnly = args.has("--no-package");

function say(message) {
  console.log(`\n▸ ${message}`);
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) fail(`${command} ${commandArgs.join(" ")} failed (exit ${result.status})`);
}

if (!fs.existsSync(path.join(repoRoot, "desktop", "node_modules"))) {
  fail("desktop dependencies are missing — run:  cd desktop && npm install");
}

if (!skipBuild) {
  if (!process.env.DATABASE_URL) {
    fail(
      "DATABASE_URL is required for the build (Next reads the database while collecting page data).\n" +
        "  Locally:  npm run db:dev   (in another terminal), then\n" +
        "            DATABASE_URL=postgresql://sb:sb@127.0.0.1:5433/scholarbridge npm run desktop:dist"
    );
  }
  say("Compiling the self-contained server (next build, standalone)…");
  run("npm", ["run", "build"], {
    env: { NEXT_OUTPUT_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" },
  });
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  fail("The standalone server is missing — build without --skip-build first.");
}

say("Copying static assets into the standalone output…");
for (const [from, to] of [
  [path.join(repoRoot, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(repoRoot, "public"), path.join(standalone, "public")],
]) {
  if (!fs.existsSync(from)) fail(`missing ${from}`);
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

const size = (dir) => {
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) bytes += size(full);
    else if (entry.isFile()) bytes += fs.statSync(full).size;
  }
  return bytes;
};
say(`Standalone server ready — ${Math.round(size(standalone) / 1024 / 1024)} MB in .next/standalone`);

if (packageOnly) {
  say("Skipping the installer (--no-package).");
  process.exit(0);
}

const platformFlag =
  process.platform === "win32" ? "--win" : process.platform === "darwin" ? "--mac" : "--linux";
say(`Packaging with electron-builder (${platformFlag})…`);
run("npm", ["run", "dist", "--", platformFlag], { cwd: path.join(repoRoot, "desktop") });

say("Done. Installers are in desktop/release/");
