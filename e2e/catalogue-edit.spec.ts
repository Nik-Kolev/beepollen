import { expect, type Page, test } from "@playwright/test";

import { UNAVAILABLE_LINES } from "@/lib/checkout-messages";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { seedCart } from "./seed-cart";

const PRODUCT = "Пчелен прашец 1 кг";
const SLUG = "pchelen-prashets-1kg";
const SEEDED = { price: "45,90", stock: "PLENTY" };
const OTHER_SLUG = "pchelen-prashets-500g";
const OTHER_PRODUCT = "Пчелен прашец 500 г";

test.describe.configure({ mode: "serial" });

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

  await page.goto("/cart");
  await expect(page.getByRole("main").getByText("Изчерпан")).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Увеличи количеството на ${PRODUCT}` }),
  ).toBeDisabled();

  await page.goto("/admin/products");
  const form = page.getByRole("form", { name: PRODUCT });
  await expect(form.getByLabel("Цена (€)")).toHaveValue("47,30");
  await expect(form.getByLabel("Наличност")).toHaveValue("NONE");
});

test("an item sold out after the checkout page loaded is refused and can be removed", async ({
  page,
  browser,
}, testInfo) => {
  const admin = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  await signInAs(admin, TEST_ADMIN_EMAIL);
  const adminPage = await admin.newPage();
  await saveProduct(adminPage, SEEDED.price, SEEDED.stock);

  await seedCart(page, {
    version: 1,
    items: [
      { slug: SLUG, quantity: 1 },
      { slug: OTHER_SLUG, quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await page.getByLabel("Име и фамилия").fill("Мария Иванова");
  await page.getByLabel("Имейл", { exact: true }).fill("sold-out@example.com");
  await page.getByLabel("Телефон", { exact: true }).fill("0899777888");
  await page.getByLabel(/Съгласен съм с общите условия/).check();
  await page.getByLabel("Град", { exact: true }).fill("Павликени");
  await page.getByRole("option", { name: "Павликени", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Офиси на Еконт" })
    .locator("label")
    .filter({ hasText: "ул. Атанас Хаджиславчев №17" })
    .click();

  await saveProduct(adminPage, SEEDED.price, "NONE");
  await admin.close();

  await page.getByRole("button", { name: "Завърши поръчката" }).click();

  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toHaveText(UNAVAILABLE_LINES);
  await main.getByRole("button", { name: `Премахни ${PRODUCT}` }).click();

  await expect(main.getByText(OTHER_PRODUCT, { exact: true })).toBeVisible();
  await expect(main.getByText(PRODUCT, { exact: true })).toHaveCount(0);
  await expect(main.getByRole("alert")).toHaveCount(0);
});
