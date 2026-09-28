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
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: "catalogue-edit.spec.ts",
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "catalogue-edit.spec.ts",
    },
    {
      name: "catalogue-edit",
      use: { ...devices["Pixel 7"] },
      testMatch: "catalogue-edit.spec.ts",
      dependencies: ["mobile", "desktop"],
    },
  ],
  webServer: {
    command: "node scripts/reset-e2e-db.mjs && npm run build:demo && npm start",
    url: baseURL,
    env: {
      DATABASE_URL: "file:./data/e2e.db",
      AUTH_SECRET: TEST_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
      ADMIN_EMAILS: TEST_ADMIN_EMAIL,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
