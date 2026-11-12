import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3008",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run build && node server/index.ts",
    url: "http://127.0.0.1:3008/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      PORT: "3008",
      HOST_ACCESS_KEY: "e2e-test-host-key-not-for-production",
      DATA_DIR: `/tmp/hr-change-e2e-${Date.now()}`,
    },
  },
});
