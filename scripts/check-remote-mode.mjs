/**
 * "Window onto the site" mode — the desktop app's default.
 *
 * The app opens the hosted site over the internet and keeps no data of its
 * own, so this check answers the questions a user can be wrong-footed by:
 *
 *   1. which address is opened (env → saved → baked-in, offline choice wins),
 *   2. is a typed address usable ("scholarbridgeai-9bmd.onrender.com",
 *      "192.168.1.42:4310", "https://x/…", "ftp://…"),
 *   3. does an address answer (200 = ready, 503 = up but database not ready,
 *      nothing = unreachable, incl. the free-plan cold start),
 *   4. does the window keep the session (persistent partition + the 7-day
 *      cookie the server issues), so the password is asked once,
 *   5. is the offline copy never entered silently.
 *
 * Run with:  npm run test:remote
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILT_IN_SERVER_URL,
  describeTarget,
  normaliseServerUrl,
  probeServer,
  resolveTarget,
} from "../desktop/remote.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

/**
 * The site the shipped apps open. One place in this file: if the deployment
 * moves, every place that follows it (desktop default, APK default, dialog
 * placeholder) has to move too, and this check says which one was missed.
 */
const PRODUCTION_SITE = "https://scholarbridgeai-9bmd.onrender.com";

let passed = 0;
const failures = [];
function check(label, condition, detail = "") {
  if (condition !== true && condition !== false) {
    throw new TypeError(`check("${label}") expects a boolean, got ${typeof condition}`);
  }
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("Addresses");
check("a bare host name becomes https", normaliseServerUrl(PRODUCTION_SITE.replace(/^https:\/\//, "")) === PRODUCTION_SITE);
check("a trailing slash is dropped", normaliseServerUrl("https://x.example/") === "https://x.example");
check("a pasted address with spaces/quotes is cleaned", normaliseServerUrl('  "<https://x.example>" ') === "https://x.example");
check("a laptop on the Wi-Fi stays http", normaliseServerUrl("192.168.1.42:4310") === "http://192.168.1.42:4310");
check("localhost stays http", normaliseServerUrl("localhost:4310") === "http://localhost:4310");
check("a base path is kept", normaliseServerUrl("https://x.example/app/") === "https://x.example/app");
check("another scheme is refused", normaliseServerUrl("ftp://x.example") === "");
check("garbage is refused", normaliseServerUrl("not a url::") === "");
check("empty is refused", normaliseServerUrl("   ") === "");

console.log("\nWhich server a launch uses");
check("the built-in site is the default", (() => {
  const t = resolveTarget({});
  return t.mode === "remote" && t.url === BUILT_IN_SERVER_URL && t.source === "built-in";
})());
check("the environment wins over everything", (() => {
  const t = resolveTarget({ envUrl: "https://env.example", config: { serverUrl: "https://cfg.example" } });
  return t.url === "https://env.example" && t.source === "env";
})());
check("an address saved by the user wins over the built-in one", (() => {
  const t = resolveTarget({ config: { serverUrl: "https://mine.example" } });
  return t.url === "https://mine.example" && t.source === "config";
})());
check("the offline choice wins over both", (() => {
  const t = resolveTarget({ envUrl: "https://env.example", config: { offline: true, serverUrl: "https://mine.example" } });
  return t.mode === "local" && t.reason === "offline-copy-chosen";
})());
check("a broken saved address falls back to the site, not to the offline copy", (() => {
  const t = resolveTarget({ config: { serverUrl: "not a url::" } });
  return t.mode === "remote" && t.url === BUILT_IN_SERVER_URL;
})());
check("an empty built-in address is the only way to get the offline copy", (() => {
  const t = resolveTarget({ builtInUrl: "" });
  return t.mode === "local" && t.reason === "no-address";
})());
check("the splash names the site, not a technical URL", /Connecting to scholarbridge/.test(describeTarget({ mode: "remote", url: BUILT_IN_SERVER_URL, source: "built-in" })));

console.log("\nDoes the site answer?");
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/ready")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  if (req.url.startsWith("/nodb")) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end('{"ok":false}');
    return;
  }
  res.writeHead(404);
  res.end("not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const ready = await probeServer(`${base}/ready`, { attempts: 1 });
  check("200 means the site is ready", ready.ok && ready.kind === "ready", JSON.stringify(ready));
  const nodb = await probeServer(`${base}/nodb`, { attempts: 1 });
  check("503 means up but not ready — not 'unreachable'", nodb.ok && nodb.kind === "not_ready", JSON.stringify(nodb));
  check("an unknown path is not a valid site", !(await probeServer(`${base}/missing`, { attempts: 1 })).ok);
  const dead = await probeServer("http://127.0.0.1:1", { attempts: 1, timeoutMs: 1500 });
  check("a closed port is unreachable", !dead.ok && dead.kind === "unreachable", JSON.stringify(dead));
  check("an invalid address is refused before any request", !(await probeServer("ftp://x")).ok);
  // A host that answers slowly (a free plan waking up) must not be called down.
  const slow = http.createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(200);
      res.end("ok");
    }, 900);
  });
  await new Promise((resolve) => slow.listen(0, "127.0.0.1", resolve));
  const slowUrl = `http://127.0.0.1:${slow.address().port}`;
  const slowResult = await probeServer(slowUrl, { attempts: 1, timeoutMs: 5000 });
  check("a slow first answer (cold start) still counts as ready", slowResult.ok, JSON.stringify(slowResult));
  const tooSlow = await probeServer(slowUrl, { attempts: 1, timeoutMs: 200 });
  check("a timeout is reported, not thrown", !tooSlow.ok && /no answer/.test(tooSlow.detail), JSON.stringify(tooSlow));
  await new Promise((resolve) => slow.close(resolve));
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("\nThe app keeps the session (password asked once)");
const mainSrc = read("desktop/main.mjs");
const authSrc = read("src/lib/auth.ts");
check("the window uses a persistent partition", /partition:\s*"persist:scholarbridge"/.test(mainSrc));
check("the address is opened in the window, not downloaded", /createMainWindow\(target\.url\)/.test(mainSrc));
check("the bundled engine is NOT started when the site is used", (() => {
  const boot = mainSrc.slice(mainSrc.indexOf("async function boot()"), mainSrc.indexOf("async function restartServer"));
  const remoteBranch = boot.slice(0, boot.indexOf("offline mode"));
  // The remote branch must open the site and return before any engine code.
  return (
    remoteBranch.includes("createMainWindow(target.url)") &&
    remoteBranch.includes("return") &&
    !remoteBranch.includes("startLocalServer")
  );
})());
check("the site session cookie is persistent (Max-Age), not session-only", /Max-Age=\$\{ttl\}/.test(authSrc));
check("the session lasts a week", /SESSION_TTL_SECONDS = 60 \* 60 \* 24 \* 7/.test(authSrc));
check("an unreachable site explains itself and offers the offline copy", (() => {
  return /did-fail-load/.test(mainSrc) && /reportRemoteError/.test(mainSrc) && /Use the offline copy/.test(mainSrc);
})());
check("switching to the offline copy is a deliberate menu choice", /label: "Use the offline copy"/.test(mainSrc));
check("a wrong address is reported instead of silently ignored", /That address cannot be used/.test(mainSrc));
check("the phone QR points at the site when online", /online \? target\.url : addresses\[0\]/.test(mainSrc));
check("sharing over Wi-Fi is disabled online (the site is already public)", /enabled: target\.mode === "local"/.test(mainSrc));
check("the site's page cannot change the app's configuration", (() => {
  // The IPC channel is only honoured for the address window's own contents.
  const handler = mainSrc.slice(mainSrc.indexOf('ipcMain.on("scholarbridge:connect"'), mainSrc.indexOf('ipcMain.on("scholarbridge:connect"') + 400);
  return /event\.sender !== addressWindow\.webContents/.test(handler);
})());

console.log("\nPackaging");
check("the address module ships with the app", (() => {
  const builder = read("desktop/electron-builder.mjs");
  return /"remote\.mjs"/.test(builder) && /"server-default\.mjs"/.test(builder);
})());
check("the baked address is the production site", BUILT_IN_SERVER_URL === PRODUCTION_SITE, BUILT_IN_SERVER_URL);
// No stale address may survive in a file the shipped app reads: an old
// placeholder in the address dialog sends people to a site that is not theirs.
const staleAddresses = (() => {
  const stale = [];
  for (const rel of [
    "desktop/server-default.mjs",
    "desktop/main.mjs",
    "mobile/www/config.js",
    "scripts/build-desktop.mjs",
  ]) {
    for (const match of read(rel).matchAll(/https?:\/\/[a-z0-9.-]*onrender\.com/gi)) {
      if (match[0].replace(/\/+$/, "") !== PRODUCTION_SITE) stale.push(`${rel}: ${match[0]}`);
    }
  }
  return stale;
})();
check("no other site address is left in the app's own files", staleAddresses.length === 0, staleAddresses.join("; "));
check("the Android app opens the same site", (() => {
  const config = read("mobile/www/config.js");
  return config.includes(BUILT_IN_SERVER_URL) && BUILT_IN_SERVER_URL === PRODUCTION_SITE;
})());
const phoneShell = read("mobile/www/index.html");
check("the Android app offers 'open anyway' when a laptop address is unreachable", /openAnyway/.test(phoneShell));
check("an https site address is opened directly, without a wait", /\^https:.*i\.test\(url\)[\s\S]{0,120}open\(url\)/.test(phoneShell));
check("a LAN address is still probed (cold start allowed for)", /45000/.test(phoneShell));

console.log("");
if (failures.length) {
  console.error(`✖ ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const failure of failures) console.error(`   • ${failure}`);
  process.exit(1);
}
console.log(`remote mode check passed (${passed} assertions)`);
