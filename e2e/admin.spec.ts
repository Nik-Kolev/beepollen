import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test("an anonymous visitor to /admin is sent to the login page", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL("/admin/login");
  await expect(
    page.getByRole("button", { name: "Вход с Google" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("an anonymous visitor to the order list is sent to the login page", async ({
  page,
}) => {
  await page.goto("/admin/orders");

  await expect(page).toHaveURL("/admin/login");
});

test("a session cookie signed with another secret is treated as no session", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL, "a-secret-this-server-never-had");

  await page.goto("/admin");

  await expect(page).toHaveURL("/admin/login");
  await expect(
    page.getByRole("button", { name: "Вход с Google" }),
  ).toBeVisible();
});

test("an allowed admin opening /admin lands on the order list", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  await page.goto("/admin");

  await expect(page).toHaveURL("/admin/orders");
  await expect(
    page.getByRole("heading", { level: 1, name: "Поръчки" }),
  ).toBeVisible();
  await expect(page.getByText(TEST_ADMIN_EMAIL)).toBeVisible();
});

test("the admin pages render without the shop's header and footer", async ({
  page,
  context,
}) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");
  await expect(
    page.getByRole("heading", { level: 1, name: "Поръчки" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
});

test("the allowlist match ignores the address's case", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL.toUpperCase());

  await page.goto("/admin/orders");

  await expect(
    page.getByRole("heading", { level: 1, name: "Поръчки" }),
  ).toBeVisible();
});

test("an allowed admin opening the login page is sent on to the order list", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  await page.goto("/admin/login");

  await expect(page).toHaveURL("/admin/orders");
});

test("a valid session for an address no longer on the list is refused", async ({
  page,
  context,
}) => {
  await signInAs(context, "removed@example.com");

  await page.goto("/admin");

  await expect(page).toHaveURL("/admin/login");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Този Google акаунт няма достъп.",
  );
});

test("a sign-in Google refused shows the no-access message", async ({
  page,
}) => {
  await page.goto("/admin/login?error=AccessDenied");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Този Google акаунт няма достъп.",
  );
});

test("a repeated error parameter is read by its first value", async ({
  page,
}) => {
  await page.goto("/admin/login?error=AccessDenied&error=Configuration");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Този Google акаунт няма достъп.",
  );
});

test("any other sign-in error asks to try again", async ({ page }) => {
  await page.goto("/admin/login?error=Configuration");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Входът не успя. Опитайте отново.",
  );
});

test("signing out ends the session", async ({ page, context }) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  await page.getByRole("button", { name: "Изход" }).click();

  await expect(page).toHaveURL("/admin/login");
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/login");
});

test("both admin pages ask search engines not to index them", async ({
  page,
  context,
}) => {
  const robots = page.locator('meta[name="robots"]');

  await page.goto("/admin/login");
  await expect(robots).toHaveAttribute("content", "noindex, nofollow");

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL("/admin/orders");
  await expect(robots).toHaveAttribute("content", "noindex, nofollow");
});
