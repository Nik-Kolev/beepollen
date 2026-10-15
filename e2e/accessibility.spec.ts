import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { seedCart } from "./seed-cart";

const PAGES = [
  ["the homepage", "/"],
  ["a product page", "/products/pchelen-prashets-500g"],
  ["the cart page", "/cart"],
  ["the checkout page", "/checkout"],
  ["the not-found page", "/no-such-page"],
  ["an unknown product slug", "/products/no-such-product"],
  ["the admin login page", "/admin/login"],
  ["the admin order list", "/admin/orders"],
  ["the admin product list", "/admin/products"],
  ["the admin statistics page", "/admin/analytics"],
] as const;

const SIGNED_IN: readonly string[] = [
  "/admin/orders",
  "/admin/products",
  "/admin/analytics",
];

for (const [name, path] of PAGES) {
  test(`${name} has no accessibility violations`, async ({ page, context }) => {
    if (SIGNED_IN.includes(path)) {
      await signInAs(context, TEST_ADMIN_EMAIL);
    }
    if (path === "/cart" || path === "/checkout") {
      await seedCart(page, {
        version: 1,
        items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
      });
    }

    await page.goto(path);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
    ).toEqual([]);
  });
}

test("the error page a failed order submission falls into has no accessibility violations", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
  });
  await page.goto("/checkout");
  await page.route("**/checkout", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, body: "" })
      : route.continue(),
  );

  await page.getByRole("button", { name: "Завърши поръчката" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Възникна грешка" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
});

test("a focused field draws one thin frame while other controls keep the offset outline", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
  });
  await page.goto("/checkout");

  const name = page.getByLabel("Име и фамилия", { exact: true });
  await expect(name).toBeEnabled();
  await name.focus();
  await expect(name).toHaveCSS("outline-width", "1px");
  await expect(name).toHaveCSS("outline-offset", "0px");

  const submit = page.getByRole("button", { name: "Завърши поръчката" });
  await submit.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await expect(submit).toHaveCSS("outline-width", "3px");
  await expect(submit).toHaveCSS("outline-offset", "2px");
});

const LIST_PAGES = ["/", "/products/pchelen-prashets-500g"] as const;

for (const path of LIST_PAGES) {
  test(`every list on ${path} declares its role`, async ({ page }) => {
    await page.goto(path);

    expect(await page.locator("ul:not([role]), ol:not([role])").count()).toBe(
      0,
    );
  });
}
