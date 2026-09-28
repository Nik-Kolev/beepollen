import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test("an anonymous visitor to the product list is sent to the login page", async ({
  page,
}) => {
  await page.goto("/admin/products");

  await expect(page).toHaveURL("/admin/login");
});

test("every product is listed with its price and stock, drafts marked", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");

  await expect(
    page.getByRole("heading", { level: 1, name: "Продукти" }),
  ).toBeVisible();
  const forms = page.getByRole("form");
  await expect(forms).toHaveCount(3);

  const draft = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Lorem ipsum" }) });
  await expect(draft).toContainText("Непубликуван");
  await expect(draft.getByLabel("Цена (€)")).toHaveValue("0,00");
});

test("a price of zero is refused, marked on the field and not stored", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");

  const form = page.getByRole("form", { name: "Lorem ipsum" });
  const price = form.getByLabel("Цена (€)");
  await price.fill("0");
  await form.getByRole("button", { name: "Запази" }).click();

  await expect(
    form.getByText("Въведете цена над нула, например 24,50."),
  ).toBeVisible();
  await expect(price).toHaveAttribute("aria-invalid", "true");

  await price.fill("0,5");
  await expect(price).not.toHaveAttribute("aria-invalid");
  await expect(
    form.getByText("Въведете цена над нула, например 24,50."),
  ).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("form", { name: "Lorem ipsum" }).getByLabel("Цена (€)"),
  ).toHaveValue("0,00");
});

test("a save sent after the session is gone is refused and stores nothing", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");
  const form = page.getByRole("form", { name: "Lorem ipsum" });
  await form.getByLabel("Цена (€)").fill("12,00");

  await context.clearCookies();
  await form.getByRole("button", { name: "Запази" }).click();

  await expect(page).toHaveURL("/admin/login");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");
  await expect(
    page.getByRole("form", { name: "Lorem ipsum" }).getByLabel("Цена (€)"),
  ).toHaveValue("0,00");
});

test("the admin nav moves between orders and products and marks the current one", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  const nav = page.getByRole("navigation", { name: "Админ" });
  await expect(nav.getByRole("link", { name: "Поръчки" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nav.getByRole("link", { name: "Продукти" }).click();

  await expect(page).toHaveURL("/admin/products");
  await expect(nav.getByRole("link", { name: "Продукти" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Поръчки" })).not.toHaveAttribute(
    "aria-current",
  );
});
