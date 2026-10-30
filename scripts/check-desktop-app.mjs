/**
 * End-to-end check of the desktop app's boot path — the same code the
 * installed .exe/.dmg/AppImage runs, minus the Electron window:
 *
 *   private PostgreSQL → supabase/full_schema.sql → standalone Next server →
 *   /api/health answers → the landing page renders.
 *
 * It uses a throwaway data folder, so it never touches a real install.
 *
 *   npm run test:desktop-app
 *
 * Requires a prepared build:  node scripts/build-desktop.mjs --skip-build --no-package
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureEngine, resolveRuntime, startLocalServer } from "../desktop/boot.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(repoRoot, ".desktop-test-data");
const appDir = path.join(repoRoot, ".next", "standalone");
const schemaPath = path.join(repoRoot, "supabase", "full_schema.sql");

const PORT = Number(process.env.DESKTOP_TEST_PORT || 4399);
const DB_PORT = Number(process.env.DESKTOP_TEST_DB_PORT || 55999);

let passed = 0;
const failures = [];
function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  if (!fs.existsSync(path.join(appDir, "server.js"))) {
    console.error("✖ Build the desktop server first: node scripts/build-desktop.mjs --skip-build --no-package");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(repoRoot, "desktop", "node_modules", "embedded-postgres"))) {
    console.error("✖ desktop dependencies are missing: cd desktop && npm install");
    process.exit(1);
  }

  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("— booting the desktop app engine (first run, empty data folder) —");

  const t0 = Date.now();
  let server;
  try {
    server = await startLocalServer({
      appDir,
      dataDir,
      schemaPath,
      host: "127.0.0.1",
      port: PORT,
      dbPort: DB_PORT,
      log: (line) => {
        if (process.env.DESKTOP_TEST_VERBOSE === "1") console.log(`    ${line}`);
      },
    });

    console.log(`  (ready in ${((Date.now() - t0) / 1000).toFixed(1)}s)\n— assertions —`);

    check("server listens on the loopback address", server.url.startsWith("http://127.0.0.1:"));
    check("a per-install session secret was written", 
      fs.existsSync(path.join(dataDir, "session-secret")) &&
        fs.statSync(path.join(dataDir, "session-secret")).size >= 32);
    check("the database was created in the app's data folder",
      fs.existsSync(path.join(dataDir, "postgres", "PG_VERSION")));
    check("the schema stamp was recorded", fs.existsSync(path.join(dataDir, "schema-hash.txt")));

    const health = await fetch(`${server.url}/api/health`).then((r) => r.json());
    check("GET /api/health → ok", health.ok === true, JSON.stringify(health));

    const home = await fetch(server.url, { headers: { accept: "text/html" } });
    const html = await home.text();
    check("GET / renders the app HTML", home.ok && /ScholarBridge/i.test(html), `status ${home.status}`);
    check(
      "no Secure cookie / HTTPS-only policy on the plain-http install",
      !/upgrade-insecure-requests/.test(home.headers.get("content-security-policy") ?? ""),
      home.headers.get("content-security-policy") ?? "(no CSP)"
    );
    check("the app is not framed by third parties", /frame-ancestors 'none'/.test(home.headers.get("content-security-policy") ?? ""));

    const css = await fetch(`${server.url}/_next/static/css/`, { redirect: "follow" }).catch(() => null);
    check("static assets are served from the bundle", Boolean(css) && css.status < 500);

    const catalogue = await fetch(`${server.url}/api/universities?limit=1`).then((r) => r.json()).catch(() => null);
    check("the catalogue API answers without an API key", Boolean(catalogue) && !("error" in (catalogue ?? {})));

    console.log("\n— the shipped shell (no window needed) —");
    for (const file of ["main.mjs", "boot.mjs", "preload.cjs", "splash.html", "electron-builder.mjs", "build/icon.png"]) {
      check(`desktop/${file} ships with the app`, fs.existsSync(path.join(repoRoot, "desktop", file)));
    }
    const builder = (await import("../desktop/electron-builder.mjs")).default;
    // Every local import of the app must also be in electron-builder's `files`
    // list. A module that is imported but not installed crashes the app at
    // launch with ERR_MODULE_NOT_FOUND (`tar.mjs` was exactly that), so it is
    // asserted here — before anything is packaged.
    const appSources = fs
      .readdirSync(path.join(repoRoot, "desktop"))
      .filter((name) => /\.(mjs|cjs)$/.test(name));
    const declared = new Set(
      (builder.files || []).filter((entry) => !entry.startsWith("!")).map((entry) => entry.replace(/^\.\//, ""))
    );
    const missing = [];
    for (const source of appSources) {
      const text = fs.readFileSync(path.join(repoRoot, "desktop", source), "utf8");
      for (const match of text.matchAll(/(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
        const referenced = match[1].replace(/^\.\//, "");
        const existsLocally = fs.existsSync(path.join(repoRoot, "desktop", referenced));
        if (!existsLocally) {
          missing.push(`${source} imports ${match[1]}, which does not exist`);
        } else if (!declared.has(referenced)) {
          missing.push(`${source} imports ${match[1]}, which is not in the installer's files list`);
        }
      }
    }
    check("every module the app imports is packaged", missing.length === 0, missing.join("; "));
    check("the app ships its tar module", declared.has("tar.mjs"));

    check("the installer bundles the engine archive and the schema",
      builder.extraResources.some((r) => r.to === "engine.tar" || r.to === "engine.tar.gz") &&
        builder.extraResources.some((r) => r.to === "schema/full_schema.sql"));
    // One file, not ~3600: a per-file extraction can silently drop files on
    // Windows (that surfaced as MODULE_NOT_FOUND at engine start-up).
    check("the engine ships as a single archive, not a loose tree",
      !builder.extraResources.some((r) => r.to === "server"));
    // Electron runs whatever is in resources/app. Copying the compiled server
    // into that folder merges two package.json files and the app cannot start
    // ("Cannot find module …/resources/app/index.js"), so this must stay false.
    check("the compiled server is not mixed into resources/app",
      !builder.extraResources.some((r) => r.to === "app"),
      "extraResources must target `server`, not `app`");
    check("the window loads the bundled app (not a remote page)",
      /loadURL\(url\)/.test(fs.readFileSync(path.join(repoRoot, "desktop", "main.mjs"), "utf8")));
    check("the renderer gets no Node.js access",
      /contextIsolation: true/.test(fs.readFileSync(path.join(repoRoot, "desktop", "main.mjs"), "utf8")) &&
        /sandbox: true/.test(fs.readFileSync(path.join(repoRoot, "desktop", "main.mjs"), "utf8")));
  } finally {
    if (server) await server.stop();
  }

  check("shutdown released the app port", await fetch(`http://127.0.0.1:${PORT}/api/health`).then(() => false).catch(() => true));

  // ---------------------------------------------------------------------------
  // Second launch — the case that broke 1.0.3 on Windows: the cluster keeps the
  // password it was initialised with, so a password regenerated on start-up
  // fails with `password authentication failed for user "scholarbridge"`.
  // ---------------------------------------------------------------------------
  console.log("\n— second launch with the same data folder —");
  let second;
  try {
    second = await startLocalServer({
      appDir,
      dataDir,
      schemaPath,
      host: "127.0.0.1",
      port: PORT,
      dbPort: DB_PORT,
      warmUp: false,
      log: (line) => {
        if (process.env.DESKTOP_TEST_VERBOSE === "1") console.log(`    ${line}`);
      },
    });
    const health2 = await fetch(`${second.url}/api/health`).then((r) => r.json());
    check("a restart reuses the existing database", health2.ok === true, JSON.stringify(health2));
    check("the database password is on disk", fs.existsSync(path.join(dataDir, "db-password")));
  } finally {
    if (second) await second.stop();
  }

  // Simulate an install from before the password was persisted: the cluster
  // knows a password that is not the one in the file, and nobody kept it.
  console.log("\n— launch after the stored password was lost (1.0.3 installs) —");
  const passwordFile = path.join(dataDir, "db-password");
  const known = fs.readFileSync(passwordFile, "utf8");
  fs.writeFileSync(passwordFile, "a-password-this-cluster-never-knew", { mode: 0o600 });
  let repaired;
  try {
    repaired = await startLocalServer({
      appDir,
      dataDir,
      schemaPath,
      host: "127.0.0.1",
      port: PORT,
      dbPort: DB_PORT,
      warmUp: false,
      log: (line) => {
        if (process.env.DESKTOP_TEST_VERBOSE === "1") console.log(`    ${line}`);
      },
    });
    const health3 = await fetch(`${repaired.url}/api/health`).then((r) => r.json());
    check("an unknown database password is repaired, not fatal", health3.ok === true, JSON.stringify(health3));
    check("the repair keeps the data (schema still there)", fs.existsSync(path.join(dataDir, "postgres", "PG_VERSION")));
    check("the temporary trust window was closed again", !fs.existsSync(path.join(dataDir, "postgres", "pg_hba.conf.scholarbridge-backup")));
  } finally {
    if (repaired) await repaired.stop();
  }
  // Back to the password the app now owns: a further launch must just work.
  fs.writeFileSync(passwordFile, known.trim(), { mode: 0o600 });

  fs.rmSync(dataDir, { recursive: true, force: true });

  // ---------------------------------------------------------------------------
  // An install created on a non-UTF-8 Windows: initdb followed the OS code page
  // (WIN1251 on a Russian system), so the schema could never be applied —
  //   character with byte sequence 0xf0 0x9f 0x8c 0x90 … has no equivalent in
  //   encoding "WIN1251"
  // The app must rebuild that empty cluster as UTF-8 by itself.
  // ---------------------------------------------------------------------------
  console.log("\n— install whose database was created as WIN1251 (non-UTF-8 Windows) —");
  const legacyDataDir = path.join(repoRoot, ".desktop-test-data-win1251");
  const legacyServerDir = path.join(legacyDataDir, "postgres");
  fs.rmSync(legacyDataDir, { recursive: true, force: true });
  let legacyCluster;
  let recovered;
  try {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    legacyCluster = new EmbeddedPostgres({
      databaseDir: legacyServerDir,
      user: "scholarbridge",
      password: "a-password-from-an-older-build",
      port: DB_PORT + 10,
      persistent: true,
      initdbFlags: ["--encoding=WIN1251", "--locale=C"],
      onLog: () => {},
      onError: () => {},
    });
    await legacyCluster.initialise();
    await legacyCluster.start();
    await legacyCluster.stop();
    legacyCluster = undefined;

    recovered = await startLocalServer({
      appDir,
      dataDir: legacyDataDir,
      schemaPath,
      host: "127.0.0.1",
      port: PORT + 10,
      dbPort: DB_PORT + 10,
      warmUp: false,
      log: (line) => {
        if (process.env.DESKTOP_TEST_VERBOSE === "1") console.log(`    ${line}`);
      },
    });
    const health4 = await fetch(`${recovered.url}/api/health`).then((r) => r.json());
    check("a WIN1251 install is rebuilt and starts", health4.ok === true, JSON.stringify(health4));
  } catch (error) {
    check("a WIN1251 install is rebuilt and starts", false, String(error && error.message));
  } finally {
    if (legacyCluster) await legacyCluster.stop().catch(() => {});
    if (recovered) await recovered.stop();
  }

  // Verify the cluster on disk really is UTF-8 now.
  try {
    const { Client } = await import("pg");
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const password = fs.readFileSync(path.join(legacyDataDir, "db-password"), "utf8").trim();
    const verify = new EmbeddedPostgres({
      databaseDir: legacyServerDir,
      user: "scholarbridge",
      password,
      port: DB_PORT + 11,
      persistent: true,
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      onLog: () => {},
      onError: () => {},
    });
    await verify.start();
    const client = new Client({
      connectionString: `postgresql://scholarbridge:${password}@127.0.0.1:${DB_PORT + 11}/postgres`,
    });
    await client.connect();
    const { rows } = await client.query("show server_encoding");
    await client.end();
    await verify.stop();
    check("the rebuilt cluster is UTF-8", String(rows[0].server_encoding).toUpperCase() === "UTF8", rows[0].server_encoding);
  } catch (error) {
    check("the rebuilt cluster is UTF-8", false, String(error && error.message));
  }
  fs.rmSync(legacyDataDir, { recursive: true, force: true });

  // ---------------------------------------------------------------------------
  // The engine archive: packing, unpacking and self-repair.
  // ---------------------------------------------------------------------------
  console.log("\n— engine archive —");
  const { writeTarGz, extractTarGz } = await import("../desktop/tar.mjs");
  const archiveWork = path.join(repoRoot, ".desktop-test-archive");
  fs.rmSync(archiveWork, { recursive: true, force: true });
  try {
    // A tree with a path longer than tar's 100-byte name field, like Next's.
    const deepDir = path.join(
      archiveWork,
      "tree",
      "node_modules",
      "next",
      "dist",
      "client",
      "components",
      "router-reducer",
      "reducers"
    );
    fs.mkdirSync(deepDir, { recursive: true });
    const deepFile = path.join(deepDir, "has-interception-route-in-current-tree.js");
    fs.writeFileSync(deepFile, "module.exports = 42;\n");
    fs.writeFileSync(path.join(archiveWork, "tree", "server.js"), "console.log('engine');\n");

    const archive = path.join(archiveWork, "engine.tar.gz");
    writeTarGz(path.join(archiveWork, "tree"), archive);
    const files = extractTarGz(archive, path.join(archiveWork, "out"));
    check("the archive round-trips a deep path", files === 2 && fs.existsSync(path.join(archiveWork, "out", deepFile.split("tree" + path.sep)[1])),
      `${files} files`);
    check("an extracted long-path file has identical content",
      fs.readFileSync(path.join(archiveWork, "out", deepFile.split("tree" + path.sep)[1]), "utf8") === "module.exports = 42;\n");

    // A corrupt/truncated archive must fail loudly, never silently.
    fs.writeFileSync(path.join(archiveWork, "broken.tar.gz"), "not a tar.gz");
    let threw = false;
    try {
      extractTarGz(path.join(archiveWork, "broken.tar.gz"), path.join(archiveWork, "broken"));
    } catch {
      threw = true;
    }
    check("a corrupt archive fails instead of producing a half-engine", threw);
  } finally {
    fs.rmSync(archiveWork, { recursive: true, force: true });
  }

  // ensureEngine: unpacks once, reuses the marker, and re-does a partial unpack.
  console.log("\n— engine unpacking (ensureEngine) —");
  const engineWork = path.join(repoRoot, ".desktop-test-engine");
  fs.rmSync(engineWork, { recursive: true, force: true });
  try {
    const tree = path.join(engineWork, "tree");
    fs.mkdirSync(path.join(tree, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(tree, "server.js"), "// engine\n");
    fs.writeFileSync(path.join(tree, "node_modules", "dep.js"), "module.exports = 1;\n");
    const archive = path.join(engineWork, "engine.tar.gz");
    writeTarGz(tree, archive);

    const dir = await ensureEngine({ archive, dataDir: path.join(engineWork, "data") });
    check("ensureEngine unpacks the archive", Boolean(dir) && fs.existsSync(path.join(dir, "server.js")));
    check("the unpacked engine carries its dependencies", fs.existsSync(path.join(dir, "node_modules", "dep.js")));

    // Second call must not redo the work.
    const marker = path.join(dir, ".version");
    const stamp = fs.statSync(marker).mtimeMs;
    await ensureEngine({ archive, dataDir: path.join(engineWork, "data") });
    check("a second launch reuses the unpacked engine", fs.statSync(marker).mtimeMs === stamp);

    // A half-unpacked folder (crash) must be redone, not trusted.
    fs.rmSync(path.join(dir, "server.js"));
    const repaired = await ensureEngine({ archive, dataDir: path.join(engineWork, "data") });
    check("a half-unpacked engine is repaired", fs.existsSync(path.join(repaired, "server.js")));
  } finally {
    fs.rmSync(engineWork, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------------
  // The engine runtime and its failure reporting.
  // ---------------------------------------------------------------------------
  console.log("\n— engine runtime and error reporting —");
  const fakeServerDir = path.join(repoRoot, ".desktop-test-runtime", "server");
  const fakeNodeDir = path.join(repoRoot, ".desktop-test-runtime", "node");
  fs.mkdirSync(fakeServerDir, { recursive: true });
  try {
    const withoutBundle = resolveRuntime(fakeServerDir);
    check("without a bundled runtime the app uses the host Node/Electron", /Node|Electron/.test(withoutBundle.label), withoutBundle.label);

    // Ship a "bundled runtime" (a copy of this Node) and check it is preferred.
    fs.mkdirSync(fakeNodeDir, { recursive: true });
    const binary = process.platform === "win32" ? "node.exe" : "node";
    fs.copyFileSync(process.execPath, path.join(fakeNodeDir, binary));
    fs.chmodSync(path.join(fakeNodeDir, binary), 0o755);
    const withBundle = resolveRuntime(fakeServerDir);
    check("a bundled runtime in resources/node is preferred", withBundle.command === path.join(fakeNodeDir, binary), withBundle.command);
    check("the bundled runtime is reported in the log", /bundled Node v/.test(withBundle.label), withBundle.label);
  } catch (error) {
    check("the bundled runtime is preferred", false, String(error && error.message));
  } finally {
    fs.rmSync(path.join(repoRoot, ".desktop-test-runtime"), { recursive: true, force: true });
  }

  // A broken engine must say WHY: the dialog shows these lines, so the student
  // does not have to dig through a log file.
  console.log("\n— a failing engine explains itself —");
  const brokenDir = path.join(repoRoot, ".desktop-test-broken");
  fs.mkdirSync(path.join(brokenDir, "server"), { recursive: true });
  fs.writeFileSync(path.join(brokenDir, "server", "server.js"), 'throw new Error("simulated engine failure");\n');
  try {
    await startLocalServer({
      appDir: path.join(brokenDir, "server"),
      dataDir: path.join(brokenDir, "data"),
      schemaPath,
      host: "127.0.0.1",
      port: PORT + 20,
      dbPort: DB_PORT + 20,
      warmUp: false,
      serverTimeoutMs: 60_000,
      log: () => {},
    });
    check("a broken engine fails", false, "it started");
  } catch (error) {
    check("a broken engine fails", true);
    check(
      "the failure message carries the engine's own output",
      /simulated engine failure/.test(String(error && error.message)),
      String(error && error.message).slice(0, 160)
    );
  } finally {
    fs.rmSync(brokenDir, { recursive: true, force: true });
  }

  console.log("");
  if (failures.length) {
    console.error(`desktop app check FAILED — ${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    process.exit(1);
  }
  console.log(`desktop app check passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("✖ desktop app check crashed:", err);
  process.exit(1);
});
