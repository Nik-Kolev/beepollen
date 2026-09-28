import { expect, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { seedCart } from "./seed-cart";

const PRODUCT = "Пчелен прашец 1 кг";
const SLUG = "pchelen-prashets-1kg";
const SEEDED = { price: "45,90", stock: "PLENTY" };

async function saveProduct(page: Page, price: string, stock: string) {
  await page.goto("/admin/products");
  const form = page.getByRole("form", { name: PRODUCT });
  await form.getByLabel("Цена (€)").fill(price);
  await form.getByLabel("Наличност").selectOption(stock);
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(form.getByText("Запазено.")).toBeVisible();
}

test.afterAll(async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  await signInAs(context, TEST_ADMIN_EMAIL);
  await saveProduct(await context.newPage(), SEEDED.price, SEEDED.stock);
  await context.close();
});

test("a price and stock saved in the admin reach the prerendered shop pages", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  await saveProduct(page, "47,30", "NONE");

  const response = await page.goto(`/products/${SLUG}`);
  expect(response?.status()).toBe(200);
  const main = page.getByRole("main");
  await expect(main.getByText("47,30 €")).toBeVisible();
  await expect(main.getByRole("button", { name: "Изчерпан" })).toBeDisabled();

  await page.goto("/");
  await expect(
    page.getByRole("article").filter({ hasText: PRODUCT }),
  ).toContainText("47,30 €");

  await seedCart(page, { version: 1, items: [{ slug: SLUG, quantity: 1 }] });
  for (const path of ["/cart", "/checkout"]) {
    await page.goto(path);
    await expect(
      page.getByRole("main").getByText("47,30 €", { exact: true }).first(),
    ).toBeVisible();
  }

  await page.goto("/admin/products");
  const form = page.getByRole("form", { name: PRODUCT });
  await expect(form.getByLabel("Цена (€)")).toHaveValue("47,30");
  await expect(form.getByLabel("Наличност")).toHaveValue("NONE");
});
