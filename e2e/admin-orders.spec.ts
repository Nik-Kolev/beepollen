import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { CONSENT_WORDING } from "@/lib/consent";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { backdateOrderSteps } from "./e2e-db";
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

function badge(card: Locator, label: string) {
  return card.getByText(label, { exact: true });
}

async function placeOrder(page: Page, email: string) {
  await seedCart(page, {
    version: 2,
    items: [
      {
        slug: "pchelen-prashets-500g",
        name: "Пчелен прашец 500 г",
        quantity: 2,
      },
      { slug: "pchelen-prashets-1kg", name: "Пчелен прашец 1 кг", quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await page.getByLabel("Име и фамилия").fill("Админ Тестов");
  await page.getByLabel("Имейл", { exact: true }).fill(email);
  await page.getByLabel("Телефон", { exact: true }).fill("0899555444");
  await page
    .getByRole("checkbox", { name: CONSENT_WORDING.TERMS, exact: true })
    .check();
  await page.getByLabel("Град", { exact: true }).fill("Павликени");
  await page.getByRole("option", { name: "Павликени", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Офиси на Еконт" })
    .locator("label")
    .filter({ hasText: "пл. Стефан Караджа №16" })
    .click();
  await page
    .getByRole("button", { name: "Поръчай с плащане при доставка" })
    .click();

  const reference = page.getByText(/^BP\d{7,}$/);
  await expect(reference).toBeVisible();
  return (await reference.textContent())!;
}

test("an order placed through checkout appears in the order list and expands in place", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  const orderReference = await placeOrder(page, "admin.list@example.com");

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders?filter=new");

  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: orderReference }) });
  await expect(card).toContainText("Админ Тестов");
  await expect(card).toContainText("Павликени");
  await expect(badge(card, "Нова")).toBeVisible();
  await expect(card.getByRole("button", { name: "Платена" })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await card.getByRole("button", { name: "Изпратена" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Поръчки" })).toBeFocused();

  const filters = page.getByRole("navigation", {
    name: "Филтър на поръчките",
  });
  await filters.getByRole("link", { name: /^Чакат плащане/ }).click();
  await expect(page).toHaveURL("/admin/orders?filter=sent");
  await expect(badge(card, "Чака плащане")).toBeVisible();
  await expect(card).toContainText("Изпратена днес");
  await expect(card.getByRole("button", { name: "Платена" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Върната" })).toBeVisible();
  await page.reload();
  await expect(badge(card, "Чака плащане")).toBeVisible();

  const details = card.locator("details");
  await expect(
    details.getByRole("link", { name: "+359899555444" }),
  ).toBeHidden();

  await card.getByText("Детайли").click();

  await expect(page).toHaveURL("/admin/orders?filter=sent");
  await expect(
    details.getByRole("listitem").filter({ hasText: " × " }),
  ).toHaveCount(2);
  await expect(details).toContainText("Пчелен прашец 500 г");
  await expect(details).toContainText("Пчелен прашец 1 кг");
  await expect(
    details.getByRole("link", { name: "+359899555444" }),
  ).toHaveAttribute("href", "tel:+359899555444");
  await expect(
    details.getByRole("link", { name: "admin.list@example.com" }),
  ).toBeVisible();
  await expect(details).toContainText("пл. Стефан Караджа №16");
  await expect(details).toContainText("Еконт");
  await expect(details).toContainText(CONSENT_WORDING.TERMS);
  await expect(details).toContainText("Без съгласие за оферти по имейл.");

  await expectNoAxeViolations(page);
});

test("a step the server fails to save says so, a returned parcel shows in the error colour and stays among the open orders, a stale screen is told the order changed, and a lost session goes to the login page", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  const orderReference = await placeOrder(page, "admin.mark@example.com");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  const cardOn = (target: Page) =>
    target
      .getByRole("article")
      .filter({ has: target.getByRole("heading", { name: orderReference }) });
  const card = cardOn(page);
  const notSaved = card
    .getByRole("status")
    .filter({ hasText: "Не е запазено. Опитайте отново." });

  await page.route("**/admin/orders*", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500 })
      : route.continue(),
  );
  await card.getByRole("button", { name: "Изпратена" }).click();

  await expect(notSaved).toBeVisible();
  await expect(badge(card, "Нова")).toBeVisible();

  await page.unrouteAll();
  await card.getByRole("button", { name: "Изпратена" }).click();
  await expect(badge(card, "Чака плащане")).toBeVisible();
  await expect(notSaved).toHaveCount(0);

  await card.getByRole("button", { name: "Върната" }).click();
  await page
    .getByRole("dialog", { name: "Сигурни ли сте?" })
    .getByRole("button", { name: "Да, върната е" })
    .click();
  const returnedBadge = badge(card, "Върната — за прибиране");
  await expect(returnedBadge).toBeVisible();
  await expect
    .poll(() =>
      returnedBadge.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--color-error)";
        document.body.append(probe);
        const error = getComputedStyle(probe).color;
        probe.remove();
        return getComputedStyle(element).backgroundColor === error;
      }),
    )
    .toBe(true);

  await page.goto("/admin/orders?open=1");
  await expect(badge(card, "Върната — за прибиране")).toBeVisible();

  await page.goto("/admin/orders");
  const other = await context.newPage();
  await other.goto("/admin/orders");
  await cardOn(other).getByRole("button", { name: "Прибрана" }).click();
  await expect(badge(cardOn(other), "Отказана")).toBeVisible();

  await card.getByRole("button", { name: "Прибрана" }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Поръчката вече е променена от друг екран.",
  );
  await expect(badge(card, "Върната — за прибиране")).toBeVisible();
  await other.close();

  await card.getByRole("button", { name: "Обнови" }).click();
  await expect(badge(card, "Отказана")).toBeVisible();

  const hideClosed = page.getByRole("checkbox", {
    name: /^Скрий приключените/,
  });
  await hideClosed.check();
  await expect(page).toHaveURL("/admin/orders?open=1");
  await expect(card).toHaveCount(0);
  await hideClosed.uncheck();
  await expect(page).toHaveURL("/admin/orders");
  await expect(badge(card, "Отказана")).toBeVisible();

  await card.getByRole("button", { name: "Върни назад" }).click();
  await page
    .getByRole("dialog", { name: "Сигурни ли сте?" })
    .getByRole("button", { name: "Да, върни" })
    .click();
  await expect(badge(card, "Върната — за прибиране")).toBeVisible();

  await context.clearCookies();
  await card.getByRole("button", { name: "Прибрана" }).click();

  await expect(page).toHaveURL("/admin/login");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");
  await expect(badge(card, "Върната — за прибиране")).toBeVisible();
});

test("the list shows five orders, loads five more on request, and filters always start from five", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  await placeOrder(page, "admin.more@example.com");
  await signInAs(context, TEST_ADMIN_EMAIL);
  const references = () =>
    page.getByRole("article").getByRole("heading").allTextContents();
  const filters = page.getByRole("navigation", {
    name: "Филтър на поръчките",
  });
  const loadMore = page.getByRole("link", { name: /^Зареди още/ });
  const listed = async (shown: number) => {
    let seen = { total: -1, shown: [] as string[] };
    await expect(async () => {
      const total = Number(
        (await filters
          .getByRole("link", { name: /^Всички/ })
          .textContent())!.replace(/\D/g, ""),
      );
      seen = { total, shown: await references() };
      expect(seen.shown).toHaveLength(Math.min(total, shown));
    }).toPass();
    return seen;
  };

  await page.goto("/admin/orders");
  const first = await listed(5);

  if (first.total > 5) {
    await loadMore.click();
    await expect(page).toHaveURL("/admin/orders?shown=10");
    const more = await listed(10);
    const offset = more.shown.indexOf(first.shown[0]);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThanOrEqual(5);
    expect(more.shown.slice(offset, offset + 5)).toEqual(first.shown);
  } else {
    await expect(loadMore).toHaveCount(0);
  }

  await page.goto("/admin/orders?shown=9999");
  await listed(100);
  await expect(loadMore).toHaveCount(0);

  for (const href of await filters
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).not.toContain("shown=");
  }
});

test("undo and cancel ask first, naming the order and what will change, and undo still works a month later", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  const orderReference = await placeOrder(page, "admin.undo@example.com");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: orderReference }) });

  await card.getByRole("button", { name: "Изпратена" }).click();
  await card.getByRole("button", { name: "Платена" }).click();
  await expect(badge(card, "Платена")).toBeVisible();
  const undo = card.getByRole("button", { name: "Върни назад" });
  await expect(undo).toBeVisible();

  backdateOrderSteps(orderReference, 30 * 24);
  await page.reload();

  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await undo.click();
  await expect(dialog).toContainText(
    `Поръчка ${orderReference} на Админ Тестов ще се върне от „Платена“ на „Чака плащане“.`,
  );
  await expect(dialog.getByRole("button", { name: "Отказ" })).toBeFocused();

  await dialog.getByRole("button", { name: "Отказ" }).click();
  await expect(dialog).toBeHidden();
  await expect(undo).toBeFocused();
  await expect(badge(card, "Платена")).toBeVisible();

  await undo.click();
  await dialog.getByRole("button", { name: "Да, върни" }).click();
  await expect(badge(card, "Чака плащане")).toBeVisible();
  await expect(card).toContainText(/Изпратена преди \d+ дни/);

  await undo.click();
  await dialog.getByRole("button", { name: "Да, върни" }).click();
  await expect(badge(card, "Нова")).toBeVisible();

  await card.getByRole("button", { name: "Откажи" }).click();
  await expect(dialog).toContainText(
    `Поръчка ${orderReference} на Админ Тестов ще бъде отказана и няма да се изпраща.`,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(badge(card, "Нова")).toBeVisible();
});

test("an order has no page of its own any more, so its old address is the 404 page", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  const response = await page.goto("/admin/orders/BP000000");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Страницата не е намерена" }),
  ).toBeVisible();
});
