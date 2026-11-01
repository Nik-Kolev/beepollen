import { expect, type Page, test } from "@playwright/test";

import { SOLD_OUT_LINES, UNAVAILABLE_LINES } from "@/lib/checkout-messages";
import { CONSENT_WORDING } from "@/lib/consent";
import { formatPrice } from "@/lib/money";

import {
  SMALL_CITY,
  SMALL_CITY_OFFICE_B,
} from "../tests/support/fixture-offices";
import { TEST_ADMIN_EMAIL, TEST_REVALIDATE_SECRET } from "./admin-env";
import { signInAs } from "./admin-session";
import { setProductPrice } from "./e2e-db";
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
  await expect(form.getByRole("status")).toHaveText("Запазено.");
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

  await saveProduct(page, "47,30", "LOW");

  const response = await page.goto(`/products/${SLUG}`);
  expect(response?.status()).toBe(200);
  const main = page.getByRole("main");
  await expect(main.getByText("47,30 €")).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("article").filter({ hasText: PRODUCT }),
  ).toContainText("47,30 €");

  await seedCart(page, {
    version: 2,
    items: [{ slug: SLUG, name: PRODUCT, quantity: 1 }],
  });
  for (const path of ["/cart", "/checkout"]) {
    await page.goto(path);
    await expect(
      page.getByRole("main").getByText("47,30 €", { exact: true }).first(),
    ).toBeAttached();
  }

  await saveProduct(page, "47,30", "NONE");

  await page.goto(`/products/${SLUG}`);
  await expect(main.getByRole("button", { name: "Изчерпан" })).toBeDisabled();

  await page.goto("/cart");
  await expect(
    page.getByRole("main").getByText("Изчерпан", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(SOLD_OUT_LINES)).toBeVisible();
  await expect(page.getByRole("link", { name: "Към поръчката" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: `Премахни ${PRODUCT}` }),
  ).toBeVisible();
  await expect(page.getByText("Общо:")).toHaveText(`Общо: ${formatPrice(0)}`);

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
    version: 2,
    items: [
      { slug: SLUG, name: PRODUCT, quantity: 1 },
      { slug: OTHER_SLUG, name: OTHER_PRODUCT, quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await page.getByLabel("Име и фамилия").fill("Мария Иванова");
  await page.getByLabel("Имейл", { exact: true }).fill("sold-out@example.com");
  await page.getByLabel("Телефон", { exact: true }).fill("0899777888");
  await page
    .getByRole("checkbox", { name: CONSENT_WORDING.TERMS, exact: true })
    .check();
  await page.getByLabel("Град", { exact: true }).fill(SMALL_CITY);
  await page.getByRole("option", { name: SMALL_CITY, exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Офиси на Еконт" })
    .locator("label")
    .filter({ hasText: SMALL_CITY_OFFICE_B.street })
    .click();

  await saveProduct(adminPage, SEEDED.price, "NONE");
  await admin.close();

  const submit = page.getByRole("button", {
    name: "Поръчай с плащане при доставка",
  });
  await submit.click();

  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toHaveText(UNAVAILABLE_LINES);
  await expect(submit).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Потвърждение" }),
  ).toContainText("Общо30,40 €");
  await main.getByRole("button", { name: `Премахни ${PRODUCT}` }).click();

  await expect(main.getByText(OTHER_PRODUCT, { exact: true })).toBeVisible();
  await expect(main.getByText(PRODUCT, { exact: true })).toHaveCount(0);
  await expect(main.getByRole("alert")).toHaveCount(0);
  await expect(submit).toBeEnabled();
});

test("the revalidate route re-renders the prerendered pages from the database", async ({
  page,
  request,
}) => {
  const paths = [`/products/${SLUG}`, "/"];
  const main = page.getByRole("main");
  async function expectPrice(price: string) {
    for (const path of paths) {
      await page.goto(path);
      await expect(main.getByText(`${price} €`)).toBeVisible();
    }
  }

  await expectPrice(SEEDED.price);
  setProductPrice(SLUG, 4810);
  await expectPrice(SEEDED.price);

  for (const headers of [
    {},
    { authorization: "Bearer not-the-secret" },
  ] as Record<string, string>[]) {
    const refused = await request.post("/api/revalidate", { headers });
    expect(refused.status()).toBe(401);
  }
  await expectPrice(SEEDED.price);

  const response = await request.post("/api/revalidate", {
    headers: { authorization: `Bearer ${TEST_REVALIDATE_SECRET}` },
  });
  expect(response.status()).toBe(204);
  await expectPrice("48,10");
});
