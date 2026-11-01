import { defineConfig, devices } from "@playwright/test";

import {
  TEST_ADMIN_EMAIL,
  TEST_AUTH_SECRET,
  TEST_EMAIL_TOKEN_SECRET,
  TEST_REVALIDATE_SECRET,
} from "./e2e/admin-env";
import { COOKIE_CONSENT_KEY } from "./src/lib/cookie-consent";

const port = process.env.E2E_PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "retain-on-failure",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [{ name: COOKIE_CONSENT_KEY, value: "rejected" }],
        },
      ],
    },
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: "catalogue-*.spec.ts",
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "catalogue-*.spec.ts",
    },
    {
      name: "catalogue-edit",
      use: { ...devices["Pixel 7"] },
      testMatch: "catalogue-edit.spec.ts",
      dependencies: ["mobile", "desktop"],
    },
    {
      name: "catalogue-fixtures",
      use: { ...devices["Pixel 7"] },
      testMatch: "catalogue-fixtures.spec.ts",
      dependencies: ["catalogue-edit"],
    },
  ],
  webServer: {
    command:
      "node scripts/reset-e2e-db.mjs && npm run build:demo && node --import tsx scripts/seed-test-fixtures.ts && npm start",
    url: baseURL,
    env: {
      PORT: port,
      DATABASE_URL: "file:./data/e2e.db",
      AUTH_SECRET: TEST_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
      ADMIN_EMAILS: TEST_ADMIN_EMAIL,
      ORDERING_OPEN: "true",
      RESEND_API_KEY: "",
      OWNER_EMAIL: "",
      EMAIL_TOKEN_SECRET: TEST_EMAIL_TOKEN_SECRET,
      REVALIDATE_SECRET: TEST_REVALIDATE_SECRET,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-E2ETEST000",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
