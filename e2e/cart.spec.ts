import { expect, type Page, test } from "@playwright/test";

import { seedCart } from "./seed-cart";

const POLLEN_SLUG = "pchelen-prashets-500g";
const POLLEN_NAME = "Пчелен прашец 500 г";
const SECOND_SLUG = "pchelen-prashets-1kg";
const SECOND_NAME = "Пчелен прашец 1 кг";

function cartLink(page: Page) {
  return page.getByRole("banner").getByRole("link", { name: /Количка/ });
}

function cartRows(page: Page) {
  return page.getByRole("main").getByRole("listitem");
}

test("adding a product counts it in the header", async ({ page }) => {
  await page.goto(`/products/${POLLEN_SLUG}`);

  const add = page.getByRole("button", { name: "Добави в количката" });

  await add.click();
  await expect(page.getByRole("status")).toHaveText("1 бр. в количката");
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");

  await add.click();
  await expect(page.getByRole("status")).toHaveText("2 бр. в количката");
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 2 бр.");
});

test("the cart survives a reload", async ({ page }) => {
  await page.goto(`/products/${POLLEN_SLUG}`);
  await page.getByRole("button", { name: "Добави в количката" }).click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");

  await page.reload();

  await expect(page.getByRole("status")).toHaveText("1 бр. в количката");
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
});

test("the cart page lists a line per product", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 2 },
      { slug: SECOND_SLUG, quantity: 1 },
    ],
  });
  await page.goto("/cart");

  await expect(cartRows(page)).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: POLLEN_NAME, exact: true }),
  ).toHaveAttribute("href", `/products/${POLLEN_SLUG}`);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 3 бр.");
});

test("the stepper changes a line's quantity", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  await page.goto("/cart");

  const decrease = page.getByRole("button", {
    name: `Намали количеството на ${POLLEN_NAME}`,
  });
  const increase = page.getByRole("button", {
    name: `Увеличи количеството на ${POLLEN_NAME}`,
  });

  await expect(decrease).toBeDisabled();

  await increase.click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 2 бр.");
  await expect(decrease).toBeEnabled();

  await decrease.click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
  await expect(decrease).toBeDisabled();
});

test("removing a line leaves the others", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 2 },
      { slug: SECOND_SLUG, quantity: 1 },
    ],
  });
  await page.goto("/cart");

  await cartRows(page)
    .filter({ hasText: SECOND_NAME })
    .getByRole("button", { name: /Премахни/ })
    .click();

  await expect(cartRows(page)).toHaveCount(1);
  await expect(cartRows(page)).toContainText(POLLEN_NAME);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 2 бр.");
});

test("emptying the cart shows the way back to the catalogue", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  await page.goto("/cart");

  await cartRows(page)
    .getByRole("button", { name: /Премахни/ })
    .click();

  await expect(page.getByText("Количката е празна.")).toBeVisible();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");

  await page.getByRole("link", { name: "Към продуктите" }).click();
  await expect(page).toHaveURL("/");
});

test("a product that is no longer sold can still be removed", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 1 },
      { slug: "no-such-product", quantity: 1 },
    ],
  });
  await page.goto("/cart");

  const withdrawn = cartRows(page).filter({
    hasText: "Продуктът вече не се предлага",
  });

  await expect(withdrawn).toContainText("no-such-product");

  await withdrawn.getByRole("button", { name: /Премахни/ }).click();

  await expect(cartRows(page)).toHaveCount(1);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
});

test("an unreadable stored cart is discarded", async ({ page }) => {
  await seedCart(page, "not json at all");
  await page.goto("/cart");

  await expect(page.getByText("Количката е празна.")).toBeVisible();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
});

test("a cart stored by a later version is discarded", async ({ page }) => {
  await seedCart(page, {
    version: 9,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  await page.goto("/cart");

  await expect(page.getByText("Количката е празна.")).toBeVisible();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
});

test("a line cannot be raised past the maximum", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 99 }],
  });
  await page.goto("/cart");

  await expect(
    page.getByRole("button", {
      name: `Увеличи количеството на ${POLLEN_NAME}`,
    }),
  ).toBeDisabled();

  await page.goto(`/products/${POLLEN_SLUG}`);

  await expect(
    page.getByRole("button", { name: "Добави в количката" }),
  ).toBeDisabled();
});

for (const quantity of [0, -1, 1.5, 100]) {
  test(`a stored quantity of ${quantity} is discarded`, async ({ page }) => {
    await seedCart(page, {
      version: 1,
      items: [{ slug: POLLEN_SLUG, quantity }],
    });
    await page.goto("/cart");

    await expect(page.getByText("Количката е празна.")).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
  });
}

test("the same product stored twice becomes one line", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 2 },
      { slug: POLLEN_SLUG, quantity: 3 },
    ],
  });
  await page.goto("/cart");

  await expect(cartRows(page)).toHaveCount(1);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 5 бр.");
});

test("a second tab sees the change without reloading", async ({ context }) => {
  const first = await context.newPage();
  await first.goto(`/products/${POLLEN_SLUG}`);

  const second = await context.newPage();
  await second.goto(`/products/${SECOND_SLUG}`);
  await second.getByRole("button", { name: "Добави в количката" }).click();

  await expect(cartLink(first)).toHaveAccessibleName("Количка, 1 бр.");
});
