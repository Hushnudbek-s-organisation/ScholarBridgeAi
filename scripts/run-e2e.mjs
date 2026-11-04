import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { brotliDecompressSync } from "node:zlib";
import { createServer } from "node:net";
import chromium from "@sparticuz/chromium";

function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

/**
 * Can the bundled Chromium actually start here?
 *
 * The @sparticuz/chromium build links against the system NSS/NSPR libraries. On
 * a host without them the browser exits 127 with `libnspr4.so: cannot open
 * shared object file`, and Playwright then reports every test as "target page,
 * context or browser has been closed" — a green-looking codebase failing three
 * suites for a reason that has nothing to do with the code. Checking up front
 * turns that into one clear message.
 *
 * Returns null when the browser starts, or the loader's error line when it does
 * not.
 */
function browserLaunchProblem(executablePath) {
  const probe = spawnSync(executablePath, ["--version"], { encoding: "utf8", timeout: 20000 });
  if (probe.error) return probe.error.message;
  if (probe.status === 0) return null;
  const text = `${probe.stderr || ""}${probe.stdout || ""}`.trim();
  return text.split("\n").filter(Boolean).pop() || `exit code ${probe.status}`;
}

const [databasePort, appPort] = await Promise.all([freeLoopbackPort(), freeLoopbackPort()]);
if (databasePort === appPort) throw new Error("Port allocator returned a duplicate port; retry E2E.");
const executablePath = await chromium.executablePath();
let launchProblem = browserLaunchProblem(executablePath);
let bundledRuntimeDir;
// The npm package already bundles NSS/NSPR for Amazon Linux. On minimal Linux
// runners these missing libraries can be supplied without apt, a download, or
// faking AWS environment variables. Never alter the production app's policy.
if (process.platform === "linux" && /lib(?:nspr4|nss3|nssutil3)\.so/.test(launchProblem ?? "")) {
  const require = createRequire(import.meta.url);
  const archive = join(dirname(require.resolve("@sparticuz/chromium")), "..", "bin", "al2023.tar.br");
  bundledRuntimeDir = mkdtempSync(join(tmpdir(), "sb-browser-runtime-"));
  try {
    const extracted = spawnSync("tar", ["-xf", "-", "-C", bundledRuntimeDir], {
      input: brotliDecompressSync(readFileSync(archive)), encoding: "utf8", timeout: 20_000,
    });
    if (extracted.error || extracted.status !== 0) throw extracted.error ?? new Error(extracted.stderr);
    process.env.LD_LIBRARY_PATH = [join(bundledRuntimeDir, "lib"), process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
    launchProblem = browserLaunchProblem(executablePath);
    if (!launchProblem) console.log("E2E: using package-bundled NSS/NSPR runtime libraries.");
  } catch (error) {
    console.error(`Bundled browser runtime preparation failed: ${error.message}`);
  }
}
if (launchProblem) {
  console.error(
    [
      "",
      "E2E cannot run on this machine: the bundled Chromium will not start.",
      `  ${launchProblem}`,
      "",
      "This is an environment problem, not a test failure — no application code was executed.",
      "Install the browser's system libraries on the runner and try again, e.g. on Debian/Ubuntu:",
      "  sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \\",
      "       libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \\",
      "       libgbm1 libpango-1.0-0 libasound2",
      "",
    ].join("\n"),
  );
  if (bundledRuntimeDir) rmSync(bundledRuntimeDir, { recursive: true, force: true });
  process.exit(3);
}
const env = {
  ...process.env,
  E2E_DATABASE_PORT: String(databasePort),
  E2E_PORT: String(appPort),
  E2E_BASE_URL: `http://127.0.0.1:${appPort}`,
  E2E_CHROMIUM_EXECUTABLE_PATH: executablePath,
  // Lambda's single-process mode cannot reliably open successive Playwright
  // contexts. Keep renderer isolation and normal web security for a local
  // multi-page audit rather than suppressing browser-origin failures.
  E2E_CHROMIUM_ARGS: JSON.stringify(chromium.args.filter((arg) => ![
    "--single-process", "--disable-web-security", "--disable-site-isolation-trials",
    "--allow-running-insecure-content",
  ].includes(arg))),
};
try {
  const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (bundledRuntimeDir) rmSync(bundledRuntimeDir, { recursive: true, force: true });
}
