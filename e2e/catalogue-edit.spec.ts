import { expect, type Page, test } from "@playwright/test";

import {
  SOLD_OUT_LINES,
  totalChanged,
  UNAVAILABLE_LINES,
} from "@/lib/checkout-messages";
import { CONSENT_WORDING } from "@/lib/consent";
import { TODO_ECONT_TARIFF_CENTS } from "@/lib/econt";
import { formatPrice } from "@/lib/money";

import {
  SMALL_CITY,
  SMALL_CITY_OFFICE_B,
} from "../tests/support/fixture-offices";
import { TEST_ADMIN_EMAIL, TEST_REVALIDATE_SECRET } from "./admin-env";
import { signInAs } from "./admin-session";
import {
  addOldPriceChanges,
  deleteOldPriceChanges,
  endOpenPromotions,
  setProductPrice,
} from "./e2e-db";
import { seedCart } from "./seed-cart";

const PRODUCT = "Пчелен прашец 1 кг";
const SLUG = "pchelen-prashets-1kg";
const SEEDED = { price: "45,90", stock: "PLENTY" };
const OTHER_SLUG = "pchelen-prashets-500g";
const OTHER_PRODUCT = "Пчелен прашец 500 г";

test.describe.configure({ mode: "serial" });

async function saveProduct(page: Page, price: string, stock: string) {
  await page.goto("/admin/products");
  const form = page.getByRole("form", { name: PRODUCT, exact: true });
  await form.getByLabel("Цена (€)").fill(price);
  await form.getByLabel("Наличност").selectOption(stock);
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");
}

async function fillCheckout(page: Page, email: string, phone: string) {
  await page.getByLabel("Име и фамилия").fill("Мария Иванова");
  await page.getByLabel("Имейл", { exact: true }).fill(email);
  await page.getByLabel("Телефон", { exact: true }).fill(phone);
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
}

test.afterAll(async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  await signInAs(context, TEST_ADMIN_EMAIL);
  endOpenPromotions(SLUG);
  deleteOldPriceChanges(SLUG);
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
  const form = page.getByRole("form", { name: PRODUCT, exact: true });
  await expect(form.getByLabel("Цена (€)")).toHaveValue("47,30");
  await expect(form.getByLabel("Наличност")).toHaveValue("NONE");
});

test("a promotion started today shows the struck regular price on every shop page until it is ended", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await saveProduct(page, SEEDED.price, SEEDED.stock);

  const sofiaDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
  });
  const today = sofiaDay.format(new Date());
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);
  const article = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: PRODUCT, exact: true }) });
  const shownToday = today.split("-").reverse().join(".");
  const panel = article.getByRole("region", { name: "Промоция" });
  const form = panel.getByRole("form", { name: `Промоция за ${PRODUCT}` });
  await form.getByLabel("Процент (%)").fill("20");
  await form.getByLabel("От").fill(today);
  await form.getByLabel("До (включително)").fill(tomorrow);
  await form.getByRole("button", { name: "Добави промоция" }).click();
  await expect(panel.getByRole("status")).toHaveText("Запазено.");

  const main = page.getByRole("main");
  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: PRODUCT });
  await expect(card).toContainText("Промоционална цена 36,72 €");
  await expect(card.locator("s")).toHaveText("Редовна цена 45,90 €");
  const badge = `−20% до ${tomorrow.split("-").reverse().join(".").slice(0, 5)}`;
  await expect(card.getByText(badge, { exact: true })).toBeVisible();

  await page.goto(`/products/${SLUG}`);
  await expect(main).toContainText("Промоционална цена 36,72 €");
  await expect(main.locator("s")).toHaveText("Редовна цена 45,90 €");
  await expect(main.getByText(badge, { exact: true })).toBeVisible();
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "",
  );
  expect(jsonLd.offers).toMatchObject({
    price: "36.72",
    priceValidUntil: tomorrow,
  });

  await seedCart(page, {
    version: 2,
    items: [{ slug: SLUG, name: PRODUCT, quantity: 2 }],
  });
  await page.goto("/cart");
  await expect(main).toContainText("Промоционална цена 36,72 € / бр.");
  await expect(main.locator("s")).toHaveText("Редовна цена 45,90 €");
  await expect(main.getByText(badge, { exact: true })).toBeVisible();
  await expect(page.getByText("Общо:")).toHaveText("Общо: 73,44 €");

  await page.goto("/checkout");
  const checkoutLine = page
    .getByRole("region", { name: "Потвърждение" })
    .getByRole("listitem")
    .filter({ hasText: PRODUCT });
  await expect(checkoutLine).toHaveText(
    new RegExp(
      `^${PRODUCT} × 2\\s*73,44\\s€\\s*Промоционална цена 36,72\\s€ / бр\\.\\s*Редовна цена 45,90\\s€\\s*${badge}$`,
    ),
  );
  await expect(checkoutLine.locator("s")).toBeVisible();
  await expect(checkoutLine.getByText(badge, { exact: true })).toBeVisible();

  await page.goto("/admin/products");
  await panel
    .getByText("Активна промоция")
    .locator("..")
    .getByRole("button", { name: "Прекрати", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Сигурни ли сте?" })
    .getByRole("button", { name: "Прекрати промоцията" })
    .click();
  await expect(
    panel
      .getByRole("listitem")
      .filter({ hasText: `Прекратена промоция на ${shownToday}` })
      .filter({ hasText: `От${shownToday}` })
      .filter({ hasText: "Отстъпка−20%" }),
  ).toHaveCount(1);

  await page.goto(`/products/${SLUG}`);
  await expect(main.getByText("45,90 €", { exact: true })).toBeVisible();
  await expect(main.locator("s")).toHaveCount(0);
});

test("a new regular price asks before ending the open promotion: cancel keeps both, confirm ends it", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await saveProduct(page, SEEDED.price, SEEDED.stock);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
  }).format(new Date());
  const [year, month, day] = today.split("-");
  const shownDay = `${day}.${month}.${year}`;
  const article = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: PRODUCT, exact: true }) });
  const panel = article.getByRole("region", { name: "Промоция" });
  const promotionForm = panel.getByRole("form", {
    name: `Промоция за ${PRODUCT}`,
  });
  await promotionForm.getByLabel("Процент (%)").fill("15");
  await promotionForm.getByLabel("От").fill(today);
  await promotionForm.getByLabel("До (включително)").fill(today);
  await promotionForm.getByRole("button", { name: "Добави промоция" }).click();
  await expect(panel.getByRole("status")).toHaveText("Запазено.");
  const card = panel.getByText("Активна промоция").locator("..");
  await expect(card).toContainText("Отстъпка−15%");

  const form = page.getByRole("form", { name: PRODUCT, exact: true });
  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await form.getByLabel("Цена (€)").fill("44,00");
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(dialog).toContainText(
    `прекратява промоцията на ${PRODUCT}: −15% (${shownDay} – ${shownDay})`,
  );
  await expect(dialog.getByRole("button", { name: "Отказ" })).toBeFocused();
  await dialog.getByRole("button", { name: "Отказ" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(form.getByLabel("Цена (€)")).toHaveValue(SEEDED.price);
  await expect(card).toContainText("Отстъпка−15%");

  await form.getByLabel("Цена (€)").fill("44,00");
  await form.getByRole("button", { name: "Запази" }).click();
  await dialog.getByRole("button", { name: "Смени цената" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");
  await expect(card).toHaveCount(0);
  const history = panel.getByRole("listitem");
  for (const text of [
    "Нова редовна цена",
    `Дата${shownDay}`,
    "Беше45,90 €",
    "Стана44,00 €",
    TEST_ADMIN_EMAIL,
  ]) {
    await expect(history.first()).toContainText(text);
  }
  await expect(history.nth(1)).toContainText(
    `Прекратена промоция на ${shownDay}`,
  );
  await expect(history.nth(1)).toContainText("Отстъпка−15%");

  const main = page.getByRole("main");
  await page.goto(`/products/${SLUG}`);
  await expect(main.getByText("44,00 €", { exact: true })).toBeVisible();
  await expect(main.locator("s")).toHaveCount(0);

  await saveProduct(page, SEEDED.price, SEEDED.stock);
});

test("the price history shows the latest ten entries and „Покажи всички“ the rest", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  deleteOldPriceChanges(SLUG);
  addOldPriceChanges(SLUG, 12);
  await page.goto("/admin/products");

  const article = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: PRODUCT, exact: true }) });
  const history = article.getByRole("listitem");
  const oldest = history.filter({ hasText: "Беше100,00 €" });
  await expect(history).toHaveCount(10);
  await expect(oldest).toHaveCount(0);

  await article.getByRole("link", { name: "Покажи всички" }).click();

  await expect(page).toHaveURL(`/admin/products?history=${SLUG}#${SLUG}`);
  await expect(oldest).toContainText("old@example.com");
  await expect(history.last()).toContainText("Беше100,00 €");
  await expect(
    article.getByRole("link", { name: "Покажи всички" }),
  ).toHaveCount(0);
  expect(await history.count()).toBeGreaterThan(12);
});

test("a price raised after the checkout page loaded is refused with the new total, and the next press orders at it", async ({
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
    items: [{ slug: SLUG, name: PRODUCT, quantity: 1 }],
  });
  await page.goto("/checkout");
  await fillCheckout(page, "price-raised@example.com", "0899777666");

  const shown = 4590 + TODO_ECONT_TARIFF_CENTS;
  const charged = 5090 + TODO_ECONT_TARIFF_CENTS;
  const confirmation = page.getByRole("region", { name: "Потвърждение" });
  await expect(confirmation).toContainText(`Общо${formatPrice(shown)}`);

  await saveProduct(adminPage, "50,90", SEEDED.stock);
  await admin.close();

  const submit = page.getByRole("button", {
    name: "Поръчай с плащане при доставка",
  });
  await submit.click();

  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toHaveText(
    totalChanged(charged, shown),
  );
  await expect(confirmation).toContainText(`Общо${formatPrice(charged)}`);

  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Поръчката е приета" }),
  ).toBeVisible();
  await expect(main).toContainText(formatPrice(charged));
});

test("a price raised again between two presses is refused with the newest total each time", async ({
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
    items: [{ slug: SLUG, name: PRODUCT, quantity: 1 }],
  });
  await page.goto("/checkout");
  await fillCheckout(page, "price-raised-twice@example.com", "0899777555");

  const shown = 4590 + TODO_ECONT_TARIFF_CENTS;
  const first = 5090 + TODO_ECONT_TARIFF_CENTS;
  const second = 5590 + TODO_ECONT_TARIFF_CENTS;
  const confirmation = page.getByRole("region", { name: "Потвърждение" });
  const main = page.getByRole("main");
  const submit = page.getByRole("button", {
    name: "Поръчай с плащане при доставка",
  });
  await expect(confirmation).toContainText(`Общо${formatPrice(shown)}`);

  await saveProduct(adminPage, "50,90", SEEDED.stock);
  await submit.click();
  await expect(main.getByRole("alert")).toHaveText(totalChanged(first, shown));

  await saveProduct(adminPage, "55,90", SEEDED.stock);
  await admin.close();
  await submit.click();
  await expect(main.getByRole("alert")).toHaveText(totalChanged(second, first));
  await expect(confirmation).toContainText(`Общо${formatPrice(second)}`);

  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Поръчката е приета" }),
  ).toBeVisible();
  await expect(main).toContainText(formatPrice(second));
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
  await fillCheckout(page, "sold-out@example.com", "0899777888");

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

  await expect(
    main
      .locator("section")
      .filter({ has: page.locator("h2", { hasText: "Вашата поръчка" }) }),
  ).toBeHidden();
  await expect(
    page
      .getByRole("region", { name: "Потвърждение" })
      .locator("p")
      .filter({ hasText: /^Общо/ }),
  ).toBeFocused();
  await expect(
    main.getByText(OTHER_PRODUCT).filter({ visible: true }),
  ).toBeVisible();
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
