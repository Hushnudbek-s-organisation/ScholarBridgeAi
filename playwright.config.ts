import { defineConfig } from "@playwright/test";

const executablePath = process.env.E2E_CHROMIUM_EXECUTABLE_PATH;
if (!executablePath) {
  throw new Error("Use `npm run test:e2e`; it configures the bundled, headless Chromium executable.");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: "list",
  outputDir: "test-results/e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL,
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath,
      args: JSON.parse(process.env.E2E_CHROMIUM_ARGS ?? "[]") as string[],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
