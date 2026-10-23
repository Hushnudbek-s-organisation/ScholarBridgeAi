import { spawnSync } from "node:child_process";
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
const launchProblem = browserLaunchProblem(executablePath);
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
  process.exit(3);
}
const env = {
  ...process.env,
  E2E_DATABASE_PORT: String(databasePort),
  E2E_PORT: String(appPort),
  E2E_BASE_URL: `http://127.0.0.1:${appPort}`,
  E2E_CHROMIUM_EXECUTABLE_PATH: executablePath,
  E2E_CHROMIUM_ARGS: JSON.stringify(chromium.args),
};
const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
