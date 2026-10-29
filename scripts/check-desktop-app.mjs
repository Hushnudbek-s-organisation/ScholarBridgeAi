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
import { startLocalServer } from "../desktop/boot.mjs";

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
    check("the installer bundles the server and the schema",
      builder.extraResources.some((r) => r.to === "server") &&
        builder.extraResources.some((r) => r.to === "schema/full_schema.sql"));
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

  fs.rmSync(dataDir, { recursive: true, force: true });

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
