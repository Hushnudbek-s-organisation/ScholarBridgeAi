/**
 * Prepare (and optionally build) the ScholarBridge Android app.
 *
 *   node scripts/build-mobile.mjs                  # icons + sync, then build a debug APK
 *   node scripts/build-mobile.mjs --no-build       # icons + sync only
 *   node scripts/build-mobile.mjs --release        # signed release APK
 *   SCHOLARBRIDGE_DEFAULT_SERVER=https://x.example node scripts/build-mobile.mjs
 *
 * The APK is an installed program on the phone — it does not run a database of
 * its own; it connects to the ScholarBridge server you run (the laptop app, or
 * a hosted deployment) and remembers the address between launches.
 *
 * Requirements for the build step: JDK 21 and the Android SDK
 * (`ANDROID_HOME` / `ANDROID_SDK_ROOT`, or `mobile/android/local.properties`
 * with `sdk.dir=...`). Without them the script still regenerates the icons and
 * syncs the web assets, and tells you how to finish in Android Studio.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(repoRoot, "mobile");
const androidDir = path.join(mobileDir, "android");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--no-build");
const release = args.has("--release");

const say = (message) => console.log(`\n▸ ${message}`);
const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? mobileDir,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

if (!fs.existsSync(path.join(mobileDir, "node_modules", "@capacitor", "cli"))) {
  fail("mobile dependencies are missing — run:  cd mobile && npm install");
}
if (!fs.existsSync(androidDir)) {
  fail("the Android platform is missing — run:  cd mobile && npx cap add android");
}

say("Generating the launcher icon and launch screen from public/icon-512.png…");
if (run(process.execPath, [path.join(mobileDir, "scripts", "generate-icons.mjs")]) !== 0) {
  fail("icon generation failed");
}

// A build can bake in the default server address so the app opens straight
// onto a hosted deployment instead of asking for an address on first launch.
const defaultServer = (process.env.SCHOLARBRIDGE_DEFAULT_SERVER || "").trim();
if (defaultServer) {
  const configPath = path.join(mobileDir, "www", "config.js");
  const value = JSON.stringify(defaultServer);
  fs.writeFileSync(
    configPath,
    `/** Set at build time by scripts/build-mobile.mjs (SCHOLARBRIDGE_DEFAULT_SERVER). */\n` +
      `window.SCHOLARBRIDGE_DEFAULT_SERVER = ${value};\n`
  );
  say(`Default server baked into the app: ${defaultServer}`);
}

say("Syncing the app shell into the Android project…");
if (run("npx", ["cap", "sync", "android"]) !== 0) fail("cap sync failed");

if (skipBuild) {
  say("Skipped the Gradle build (--no-build). Open the project with:  cd mobile && npm run open");
  process.exit(0);
}

const sdkPresent =
  Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) ||
  fs.existsSync(path.join(androidDir, "local.properties"));
const javaPresent = spawnSync("java", ["-version"], { stdio: "ignore" }).status === 0;

if (!sdkPresent || !javaPresent) {
  console.warn(
    "\n⚠ The Android SDK and/or a JDK were not found, so the APK was not compiled.\n" +
      "  Install JDK 21 + Android Studio (or the command-line SDK), then either:\n" +
      "    • GitHub Actions → Actions → “Android APK” → Run workflow (easiest), or\n" +
      "    • open mobile/android in Android Studio → Build → Build APK(s), or\n" +
      "    • re-run this script with ANDROID_HOME set.\n" +
      "\n  The project itself is ready: icons and web assets are in place."
  );
  process.exit(0);
}

const task = release ? "assembleRelease" : "assembleDebug";
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
say(`Building the ${release ? "release" : "debug"} APK (${task})…`);
if (run(gradlew, [task], { cwd: androidDir }) !== 0) {
  fail(
    "the Gradle build failed. A first build downloads Gradle and the Android\n" +
      "  dependencies (needs internet). If it is a JDK/SDK mismatch, check APP.md."
  );
}

const outputs = [
  path.join(androidDir, "app", "build", "outputs", "apk", release ? "release" : "debug"),
].filter((dir) => fs.existsSync(dir));

say("Done. APK:");
for (const dir of outputs) {
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".apk")) continue;
    const full = path.join(dir, file);
    console.log(`  ${path.relative(repoRoot, full)}  (${Math.round(fs.statSync(full).size / 1024 / 1024)} MB)`);
  }
}
console.log("\nCopy the .apk to the phone (USB, Google Drive, or the QR/link the\nlaptop app shows) and open it — Android asks once for permission to install.");
