import { defineConfig, devices } from "@playwright/test";

import { TEST_ADMIN_EMAIL, TEST_AUTH_SECRET } from "./e2e/admin-env";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build:demo && npm start",
    url: baseURL,
    env: {
      AUTH_SECRET: TEST_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
      ADMIN_EMAILS: TEST_ADMIN_EMAIL,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
