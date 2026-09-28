import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { CONSENT_WORDING } from "@/lib/consent";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { seedCart } from "./seed-cart";

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
}

test("an order placed through checkout appears in the order list and opens in full", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  await seedCart(page, {
    version: 1,
    items: [
      { slug: "pchelen-prashets-500g", quantity: 2 },
      { slug: "pchelen-prashets-1kg", quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await page.getByLabel("Име и фамилия").fill("Админ Тестов");
  await page
    .getByLabel("Имейл", { exact: true })
    .fill("admin.list@example.com");
  await page.getByLabel("Телефон", { exact: true }).fill("0899555444");
  await page.getByLabel(/Съгласен съм с общите условия/).check();
  await page.getByLabel("Град", { exact: true }).fill("Павликени");
  await page.getByRole("option", { name: "Павликени", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Офиси на Еконт" })
    .locator("label")
    .filter({ hasText: "пл. Стефан Караджа №16" })
    .click();
  await page.getByRole("button", { name: "Завърши поръчката" }).click();

  const reference = page.getByText(/^BP\d{5,}$/);
  await expect(reference).toBeVisible();
  const orderReference = (await reference.textContent())!;

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: orderReference }) });
  await expect(card).toContainText("Админ Тестов");
  await expect(card).toContainText("Павликени");
  const sent = card.getByRole("button", { name: "Изпратена" });
  await expect(sent).toHaveAttribute("aria-pressed", "false");
  await expectNoAxeViolations(page);

  await sent.click();
  await expect(sent).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(sent).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: "Платена" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  const filters = page.getByRole("navigation", {
    name: "Филтър на поръчките",
  });
  await filters.getByRole("link", { name: /^Неизпратени/ }).click();
  await expect(page).toHaveURL("/admin/orders?filter=unsent");
  await expect(card).toHaveCount(0);
  await filters.getByRole("link", { name: /^Неплатени/ }).click();
  await expect(page).toHaveURL("/admin/orders?filter=unpaid");
  await expect(card).toBeVisible();

  await card.click({ position: { x: 20, y: 60 } });

  await expect(page).toHaveURL(`/admin/orders/${orderReference}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: `Поръчка ${orderReference}`,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Изпратена" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const items = page.getByRole("region", { name: "Продукти" });
  await expect(items.getByRole("listitem")).toHaveCount(2);
  await expect(items).toContainText("Пчелен прашец 500 г");
  await expect(items).toContainText("Пчелен прашец 1 кг");

  const contact = page.getByRole("region", { name: "Клиент" });
  await expect(contact).toContainText("Админ Тестов");
  await expect(
    contact.getByRole("link", { name: "+359899555444" }),
  ).toHaveAttribute("href", "tel:+359899555444");
  await expect(
    contact.getByRole("link", { name: "admin.list@example.com" }),
  ).toBeVisible();

  const delivery = page.getByRole("region", { name: "Доставка" });
  await expect(delivery).toContainText("пл. Стефан Караджа №16");
  await expect(delivery).toContainText("Еконт");

  const consents = page.getByRole("region", { name: "Съгласия" });
  await expect(consents).toContainText(CONSENT_WORDING.TERMS);
  await expect(consents).toContainText("Без съгласие за оферти по имейл.");

  await expectNoAxeViolations(page);

  await page.getByRole("link", { name: "Всички поръчки" }).click();
  await expect(page).toHaveURL("/admin/orders");
});

test("an unknown order reference is the 404 page", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  const response = await page.goto("/admin/orders/BP000000");

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/^Страницата не е намерена/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Страницата не е намерена" }),
  ).toBeVisible();
});

test("an anonymous visitor to an order is sent to the login page", async ({
  page,
}) => {
  await page.goto("/admin/orders/BP000000");

  await expect(page).toHaveURL("/admin/login");
});
