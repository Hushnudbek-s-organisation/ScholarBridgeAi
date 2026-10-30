/**
 * Build the ScholarBridge desktop app.
 *
 *   node scripts/build-desktop.mjs              # compile + package an installer
 *   node scripts/build-desktop.mjs --no-package # only prepare .next/standalone
 *   node scripts/build-desktop.mjs --skip-build # reuse the existing build
 *   node scripts/build-desktop.mjs --verify-only # check an existing package's layout
 *   node scripts/build-desktop.mjs --skip-build --no-package --node-runtime-only
 *                                               # only stage the bundled Node.js
 *
 * What it does:
 *   1. `next build` with NEXT_OUTPUT_STANDALONE=1 (self-contained server), so
 *      the installer needs no Node.js or npm on the user's machine. No real
 *      database is required: every route is dynamic and the pg pool is lazy,
 *      so a placeholder DATABASE_URL is enough for page-data collection.
 *   2. copies `public/` and `.next/static/` into the standalone folder — Next
 *      leaves those out of its standalone output on purpose.
 *   3. hands the result to electron-builder in `desktop/`, which bundles the
 *      server into `resources/server` (never `resources/app`, which is what
 *      Electron executes) plus `resources/schema/full_schema.sql`.
 *   4. verifies the packed application's layout, renames the installers to
 *      stable, version-free names and reports their sizes.
 *
 * Needs `desktop/node_modules` (`cd desktop && npm install`).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = path.join(repoRoot, "desktop");
const releaseDir = path.join(desktopDir, "release");
const standalone = path.join(repoRoot, ".next", "standalone");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const packageOnly = args.has("--no-package");
const verifyOnly = args.has("--verify-only");

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

/** Resource folders of every packed application electron-builder produced. */
function packedResourceDirs() {
  if (!fs.existsSync(releaseDir)) return [];
  const dirs = [];
  const add = (dir) => fs.existsSync(dir) && dirs.push(dir);
  for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(releaseDir, entry.name);
    // Linux/Windows: release/linux-unpacked/resources, release/win-unpacked/resources
    if (entry.name.endsWith("-unpacked")) add(path.join(full, "resources"));
    // macOS: release/mac-arm64/ScholarBridge.app/Contents/Resources
    if (entry.name.endsWith(".app")) add(path.join(full, "Contents", "Resources"));
    if (!entry.name.endsWith("-unpacked") && !entry.name.endsWith(".app")) {
      for (const inner of fs.readdirSync(full)) {
        if (inner.endsWith(".app")) add(path.join(full, inner, "Contents", "Resources"));
      }
    }
  }
  return dirs;
}

/**
 * Check the packed application before it becomes an installer.
 *
 * This exists because a shipped build failed at launch with
 * "Cannot find module …\\resources\\app\\index.js": the compiled server had been
 * copied into `resources/app` — the folder Electron executes — and the
 * server's package.json (no `main` field) replaced the app's. Cheap checks here
 * are worth far more than a broken installer.
 */
function verifyPackagedLayout() {
  const resourcesDirs = packedResourceDirs();
  const problems = [];
  for (const resources of resourcesDirs) {
    const label = path.relative(releaseDir, resources);
    const appDir = path.join(resources, "app");
    const serverDir = path.join(resources, "server");
    const pkgFile = path.join(appDir, "package.json");

    if (!fs.existsSync(pkgFile)) {
      problems.push(`${label}/app/package.json is missing`);
      continue;
    }
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch (error) {
      problems.push(`${label}/app/package.json is not valid JSON (${error.message})`);
      continue;
    }
    const mainEntry = String(pkg.main || "");
    if (mainEntry !== "main.mjs") {
      problems.push(
        `${label}/app/package.json says main=${mainEntry || "(none)"} — expected main.mjs ` +
          "(the compiled server's package.json has overwritten the app's files)"
      );
    }
    if (!fs.existsSync(path.join(appDir, mainEntry || "index.js"))) {
      problems.push(`${label}/app/${mainEntry || "index.js"} does not exist`);
    }
    if (fs.existsSync(path.join(appDir, "index.js"))) {
      problems.push(`${label}/app/index.js exists — the compiled server was copied into resources/app`);
    }

    // Follow the app's own imports: a module that is not packaged makes the
    // app crash at launch with ERR_MODULE_NOT_FOUND. This is checked on the
    // source files too, so a missing entry in `files` fails the build before
    // anything is published.
    const seen = new Set();
    const checkImports = (file) => {
      if (seen.has(file) || !fs.existsSync(file)) return;
      seen.add(file);
      if (!/\.(mjs|cjs|js)$/.test(file)) return;
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
        const target = path.resolve(path.dirname(file), match[1]);
        if (!fs.existsSync(target)) {
          problems.push(`${path.basename(file)} imports ${match[1]}, which is not packaged`);
        } else {
          checkImports(target);
        }
      }
    };
    checkImports(path.join(appDir, "main.mjs"));
    for (const entry of fs.readdirSync(appDir)) {
      if (/\.(mjs|cjs)$/.test(entry)) checkImports(path.join(appDir, entry));
    }
    const archive = [path.join(resources, "engine.tar"), path.join(resources, "engine.tar.gz")].find((file) =>
      fs.existsSync(file)
    );
    const looseServer = path.join(serverDir, "server.js");
    if (!archive && !fs.existsSync(looseServer)) {
      problems.push(`${label}/engine.tar is missing — the app would have no engine to run`);
    }
    if (!fs.existsSync(path.join(resources, "schema", "full_schema.sql"))) {
      problems.push(`${label}/schema/full_schema.sql is missing — a new install could not create its database`);
    }
  }
  return { problems, targets: resourcesDirs.length };
}

if (verifyOnly) {
  const { problems, targets } = verifyPackagedLayout();
  if (!targets) fail("no packed application found — run the packaging step first");
  if (problems.length) fail(`the packaged app would not start:\n  • ${problems.join("\n  • ")}`);
  say(`Packaged layout OK (${targets} target${targets > 1 ? "s" : ""}): app entry, server bundle, schema.`);
  process.exit(0);
}

if (!fs.existsSync(path.join(desktopDir, "node_modules"))) {
  fail("desktop dependencies are missing — run:  cd desktop && npm install");
}

if (!skipBuild) {
  if (!process.env.DATABASE_URL) {
    // No real database is needed: every route is dynamic and the pool is lazy,
    // so `next build` only needs the variable to exist. (Verified by building
    // against an unreachable address.)
    process.env.DATABASE_URL = "postgresql://build:build@127.0.0.1:1/scholarbridge";
    console.log("[build] no DATABASE_URL set — using a placeholder; the app creates its own database.");
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

/**
 * Next's standalone output keeps one relative symlink
 * (`<server>/.next/node_modules/pg-<hash> -> ../../node_modules/pg`).
 * electron-builder's archiver cannot follow it on Windows — packaging failed
 * there with "WARNING: The system cannot find the path specified" — so the
 * installer is built from a staged copy with every link replaced by the real
 * files. The layout inside the package is unchanged.
 */
const stagingDir = path.join(desktopDir, "build-resources", "server");
say("Staging a symlink-free copy of the server for packaging…");
fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(stagingDir), { recursive: true });
fs.cpSync(standalone, stagingDir, { recursive: true });

/**
 * Replace every symlink with the real file/folder.
 *
 * `fs.cpSync`'s `dereference` option does not do this for symlink sources, so
 * it is done explicitly: copy, then walk and swap each link for its target.
 * A dangling link (which Windows could never resolve either) is dropped.
 */
let replacedLinks = 0;
let droppedLinks = 0;
function materialiseLinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      let real;
      try {
        real = fs.realpathSync(full);
      } catch {
        fs.rmSync(full, { force: true });
        droppedLinks += 1;
        continue;
      }
      const target = fs.statSync(real);
      fs.rmSync(full, { recursive: true, force: true });
      fs.cpSync(real, full, { recursive: target.isDirectory() });
      replacedLinks += 1;
      if (target.isDirectory()) materialiseLinks(full);
    } else if (entry.isDirectory()) {
      materialiseLinks(full);
    }
  }
}
materialiseLinks(stagingDir);

const countLinks = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) return total + 1;
    return entry.isDirectory() ? total + countLinks(full) : total;
  }, 0);
const links = countLinks(stagingDir);
if (links) fail(`${links} symlink(s) survived staging — Windows packaging would fail`);
say(
  `Staged server: ${Math.round(size(stagingDir) / 1024 / 1024)} MB, no symlinks` +
    (replacedLinks ? ` (${replacedLinks} link(s) materialised${droppedLinks ? `, ${droppedLinks} dangling dropped` : ""})` : "")
);

// Pack the staged server into the single archive that ships.
const engineArchive = path.join(desktopDir, "build-resources", "engine.tar");
{
  const { writeTarGz, directorySize } = await import("../desktop/tar.mjs");
  fs.rmSync(engineArchive, { force: true });
  // Plain tar: the installer's own LZMA pass compresses it better than gzip,
  // and it comes back smaller than an already-compressed archive.
  const bytes = writeTarGz(stagingDir, engineArchive, { gzip: false });
  say(
    `Engine archive: ${Math.round(bytes / 1024 / 1024)} MB tar ` +
      `(from ${Math.round(directorySize(stagingDir) / 1024 / 1024)} MB of files; the installer compresses it)`
  );
  // The loose copy is not shipped; removing it keeps the build folder small.
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

await stageNodeRuntime();

if (args.has("--node-runtime-only")) {
  say("Done (--node-runtime-only).");
  process.exit(0);
}

if (packageOnly) {
  say("Skipping the installer (--no-package).");
  process.exit(0);
}

/**
 * Bundle an official Node.js runtime with the app.
 *
 * The app is an Electron program, and Electron can execute a script "as node"
 * (ELECTRON_RUN_AS_NODE). That path proved fragile on Windows — the packaged
 * app exited with code 1 while the very same server bundle ran perfectly under
 * real Node — so the installer ships the official runtime and starts the
 * engine with it. The Electron fallback stays for builds where the download
 * was skipped.
 */
async function stageNodeRuntime() {
  const targetDir = path.join(desktopDir, "build-resources", "node");
  fs.mkdirSync(targetDir, { recursive: true }); // electron-builder needs the folder to exist

  if (args.has("--without-bundled-node") || process.env.SKIP_BUNDLED_NODE === "1") {
    say("Skipping the bundled Node runtime (--without-bundled-node).");
    return;
  }

  const version = process.version.replace(/^v/, "");
  const platforms = {
    win32: { os: "win", ext: "zip" },
    darwin: { os: "darwin", ext: "tar.gz" },
    linux: { os: "linux", ext: "tar.gz" },
  };
  const platform = platforms[process.platform];
  if (!platform) {
    say(`No Node runtime is published for ${process.platform}; the app will use Electron's.`);
    return;
  }
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const folder = `node-v${version}-${platform.os}-${arch}`;
  // Overridable so the download/extract path is testable without the public
  // network (and so a mirror can be used where nodejs.org is blocked).
  const base = (process.env.SCHOLARBRIDGE_NODE_DIST_URL || "https://nodejs.org/dist").replace(/\/$/, "") + `/v${version}`;
  const binaryName = process.platform === "win32" ? "node.exe" : "node";
  const destination = path.join(targetDir, binaryName);
  if (fs.existsSync(destination)) {
    say("Bundled Node runtime already staged.");
    return;
  }

  const archive = path.join(os.tmpdir(), `${folder}.${platform.ext}`);
  const extractDir = path.join(os.tmpdir(), `scholarbridge-node-${Date.now()}`);
  say(`Downloading the Node.js runtime for the app (${version}, ${platform.os}-${arch})…`);
  try {
    fs.mkdirSync(extractDir, { recursive: true });
    const response = await fetch(`${base}/${folder}.${platform.ext}`);
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${base}`);
    fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));

    // `tar` (bsdtar on Windows and macOS) reads both tar.gz and zip.
    const unpack = spawnSync("tar", ["-xf", archive, "-C", extractDir], { stdio: "inherit" });
    if (unpack.status !== 0) {
      if (process.platform !== "win32") throw new Error("tar could not unpack the runtime");
      const ps = spawnSync(
        "powershell",
        ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${extractDir}' -Force`],
        { stdio: "inherit" }
      );
      if (ps.status !== 0) throw new Error("could not unpack the runtime");
    }

    const released = process.platform === "win32" ? binaryName : path.join("bin", binaryName);
    const source = path.join(extractDir, folder, released);
    if (!fs.existsSync(source)) throw new Error("the runtime binary is missing from the archive");
    fs.copyFileSync(source, destination);
    if (process.platform !== "win32") fs.chmodSync(destination, 0o755);

    const check = spawnSync(destination, ["--version"], { encoding: "utf8" });
    if (check.status !== 0 || !String(check.stdout).startsWith("v")) {
      throw new Error(`the downloaded runtime did not run (${String(check.stdout).trim() || check.status})`);
    }
    say(
      `Bundled Node runtime: ${String(check.stdout).trim()} ` +
        `(${Math.round(fs.statSync(destination).size / 1024 / 1024)} MB)`
    );
  } catch (error) {
    // Not fatal: the app falls back to Electron's own Node.
    console.warn(`\n⚠ Could not bundle a Node runtime (${error.message}).`);
    console.warn("  The app will start its engine with Electron's built-in Node instead.");
  } finally {
    fs.rmSync(archive, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

const platformFlag =
  process.platform === "win32" ? "--win" : process.platform === "darwin" ? "--mac" : "--linux";
say(`Packaging with electron-builder (${platformFlag})…`);
// `dist` passes `--config electron-builder.mjs`: electron-builder does not
// auto-discover an .mjs config, and without it the app was packaged with
// DEFAULT settings — no bundled server, no schema, output in `dist/`.
run("npm", ["run", "dist", "--", platformFlag], { cwd: desktopDir });

// A build that produced an installer with a broken layout must never be
// uploaded: check what Electron will actually execute.
const layout = verifyPackagedLayout();
if (!layout.targets) {
  say("No unpacked application folder to verify (installers were produced).");
} else if (layout.problems.length) {
  fail(`the packaged app would not start:\n  • ${layout.problems.join("\n  • ")}`);
} else {
  say(`Verified the packaged app layout (${layout.targets} target${layout.targets > 1 ? "s" : ""}).`);
}

if (!fs.existsSync(releaseDir)) fail("electron-builder produced no release/ folder");
const files = fs.readdirSync(releaseDir);

/**
 * Stable, version-free installer names, so a download link never changes:
 * github.com/<owner>/<repo>/releases/latest/download/<name>. The version is
 * still visible inside the installer and in the app's About dialog.
 */
const renames = [];
for (const file of files) {
  let target = null;
  if (file.endsWith(".exe")) {
    target = /setup/i.test(file) ? "ScholarBridge-Setup.exe" : "ScholarBridge-Portable.exe";
  } else if (file.endsWith(".dmg")) {
    target = /arm64/.test(file) ? "ScholarBridge-arm64.dmg" : "ScholarBridge-x64.dmg";
  } else if (file.endsWith(".AppImage")) {
    target = "ScholarBridge.AppImage";
  } else if (file.endsWith(".deb")) {
    target = "ScholarBridge.deb";
  }
  if (!target || file === target) continue;
  fs.renameSync(path.join(releaseDir, file), path.join(releaseDir, target));
  renames.push(`${file} → ${target}`);
}
if (renames.length) say(`Stable names: ${renames.join(", ")}`);

const installers = fs.readdirSync(releaseDir).filter((f) => /\.(exe|dmg|AppImage|deb)$/i.test(f));
if (!installers.length) fail("electron-builder finished but produced no installer");
say("Done:");
for (const file of installers) {
  const mb = Math.round(fs.statSync(path.join(releaseDir, file)).size / 1024 / 1024);
  console.log(`  desktop/release/${file}  (${mb} MB)`);
}
