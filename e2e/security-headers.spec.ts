import { expect, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { seedCart } from "./seed-cart";

function recordViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  return page
    .addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (event) =>
        console.error(
          `Content Security Policy: ${event.violatedDirective} blocked ${event.blockedURI} at ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`,
        ),
      ),
    )
    .then(() => violations);
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("every response carries the security headers", async ({ request }) => {
  const home = await request.get("/");
  const asset = /\/_next\/static\/[^"]+\.js/.exec(await home.text())?.[0];
  expect(asset).toBeDefined();

  for (const path of ["/", "/api/admin-status", "/no-such-page", asset!]) {
    const headers = (await request.get(path)).headers();

    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["strict-transport-security"]).toMatch(/^max-age=\d+/);
    expect(headers["strict-transport-security"]).not.toContain("preload");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  }
});

test("the shop's pages, the map included, break no rule of the policy", async ({
  page,
}) => {
  const violations = await recordViolations(page);
  await seedCart(page, {
    version: 2,
    items: [
      {
        slug: "pchelen-prashets-500g",
        name: "Пчелен прашец 500 г",
        quantity: 1,
      },
    ],
  });

  for (const path of [
    "/",
    "/products/pchelen-prashets-500g",
    "/cart",
    "/terms",
    "/privacy",
    "/cookies",
    "/withdraw",
    "/subscription/confirm",
    "/no-such-page",
  ]) {
    await visit(page, path);
  }

  await visit(page, "/checkout");
  await page.getByLabel("Град", { exact: true }).fill("Павликени");
  await page.getByRole("option", { name: "Павликени", exact: true }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();

  expect(violations).toEqual([]);
});

test("Google Analytics, once accepted, breaks no rule of the policy", async ({
  page,
}) => {
  const violations = await recordViolations(page);
  const requested: string[] = [];
  await page.route("**/www.googletagmanager.com/**", (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  await page.goto("/cookies");
  await page
    .getByRole("button", { name: "Приемам", exact: true })
    .first()
    .click();

  await expect.poll(() => requested.length).toBeGreaterThan(0);
  expect(violations).toEqual([]);
});

test("the admin's pages, the email previews included, break no rule of the policy", async ({
  page,
  context,
}) => {
  const violations = await recordViolations(page);
  await visit(page, "/admin");
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  await signInAs(context, TEST_ADMIN_EMAIL);

  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/products",
    "/admin/analytics",
    "/admin/emails",
  ]) {
    await visit(page, path);
  }

  expect(violations).toEqual([]);
});
