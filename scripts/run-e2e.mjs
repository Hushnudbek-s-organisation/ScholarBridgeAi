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

const [databasePort, appPort] = await Promise.all([freeLoopbackPort(), freeLoopbackPort()]);
if (databasePort === appPort) throw new Error("Port allocator returned a duplicate port; retry E2E.");
const executablePath = await chromium.executablePath();
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
