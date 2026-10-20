import { expect, type Page, test } from "@playwright/test";

import { WITHDRAWN_LINES } from "@/lib/checkout-messages";
import { formatPrice } from "@/lib/money";

import { seedCart } from "./seed-cart";

const POLLEN_SLUG = "pchelen-prashets-500g";
const POLLEN_NAME = "Пчелен прашец 500 г";
const POLLEN_PRICE_CENTS = 2450;
const WITHDRAWN_SLUG = "no-such-product";
const WITHDRAWN_NAME = "Пчелен прашец 2 кг";
const SECOND_WITHDRAWN_SLUG = "no-such-product-either";
const SECOND_WITHDRAWN_NAME = "Пчелен прашец 3 кг";
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

function buzzingBees(page: Page) {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName === "buzz",
        ).length,
  );
}

test("the button confirms an add and ignores clicks until it lets go", async ({
  page,
}) => {
  await page.goto(`/products/${POLLEN_SLUG}`);

  const add = page.getByRole("button", { name: "Добави в количката" });
  const cue = page.getByText("Добавено ✓");

  await expect(cue).toBeHidden();

  await add.click();
  await expect(cue).toBeVisible();
  await expect(add).toHaveAccessibleName("Добави в количката");

  await add.click({ force: true });

  await expect(cue).toBeHidden({ timeout: 3000 });
  await expect(page.getByRole("status")).toHaveText("1 бр. в количката");
  await expect(add).toBeEnabled();
});

test("clicks landing in the same tick add only one", async ({ page }) => {
  await page.goto(`/products/${POLLEN_SLUG}`);

  const add = page.getByRole("button", { name: "Добави в количката" });

  await expect(add).toBeEnabled();
  await add.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
    button.click();
  });

  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
  await expect(page.getByRole("status")).toHaveText("1 бр. в количката");
});

test("adding a product sets the header bee buzzing", async ({ page }) => {
  await page.goto(`/products/${POLLEN_SLUG}`);
  await expect(
    page.getByRole("button", { name: "Добави в количката" }),
  ).toBeEnabled();

  expect(await buzzingBees(page)).toBe(0);

  await page.getByRole("button", { name: "Добави в количката" }).click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");

  expect(await buzzingBees(page)).toBe(1);
});

test("changing a quantity in the cart leaves the bee still", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/cart");

  await page
    .getByRole("button", { name: `Увеличи количеството на ${POLLEN_NAME}` })
    .click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 2 бр.");

  expect(await buzzingBees(page)).toBe(0);
});

test("reduced motion keeps the button cue and drops the buzz", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/products/${POLLEN_SLUG}`);

  await page.getByRole("button", { name: "Добави в количката" }).click();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
  await expect(page.getByText("Добавено ✓")).toBeVisible();

  expect(await buzzingBees(page)).toBe(0);
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
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
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
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
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
  await expect(decrease).toBeFocused();

  await decrease.press("Enter");
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
  await expect(cartRows(page)).toHaveCount(1);
  await expect(decrease).toBeFocused();
});

test("removing a line leaves the others", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
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
  await expect(
    page.getByRole("button", { name: `Премахни ${POLLEN_NAME}` }),
  ).toBeFocused();
});

test("removing a line moves focus to the next line's remove button", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
    ],
  });
  await page.goto("/cart");

  await page.getByRole("button", { name: `Премахни ${POLLEN_NAME}` }).click();

  await expect(cartRows(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: `Премахни ${SECOND_NAME}` }),
  ).toBeFocused();
});

test("emptying the cart shows the way back to the catalogue", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/cart");

  await cartRows(page)
    .getByRole("button", { name: /Премахни/ })
    .click();

  await expect(
    page.getByRole("heading", { name: "Количката е празна." }),
  ).toBeFocused();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");

  await page.getByRole("link", { name: "Към продуктите" }).click();
  await expect(page).toHaveURL("/");
});

test("a product that is no longer sold is named, left out of the total and removable", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 },
      { slug: WITHDRAWN_SLUG, name: WITHDRAWN_NAME, quantity: 3 },
    ],
  });
  await page.goto("/cart");

  const withdrawn = cartRows(page).filter({ hasText: WITHDRAWN_NAME });

  const toCheckout = page.getByRole("link", { name: "Към поръчката" });

  await expect(
    withdrawn.getByRole("heading", { name: WITHDRAWN_NAME, exact: true }),
  ).toBeVisible();
  await expect(withdrawn).toContainText("Вече не се предлага");
  await expect(withdrawn).not.toContainText(WITHDRAWN_SLUG);
  await expect(page.getByText("Общо:")).toHaveText(
    `Общо: ${formatPrice(POLLEN_PRICE_CENTS)}`,
  );
  await expect(page.getByText(WITHDRAWN_LINES)).toBeVisible();
  await expect(toCheckout).toHaveCount(0);

  await withdrawn
    .getByRole("button", { name: `Премахни ${WITHDRAWN_NAME}` })
    .click();

  await expect(cartRows(page)).toHaveCount(1);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 1 бр.");
  await expect(toCheckout).toBeFocused();
});

test("removing one of two unavailable lines keeps focus in the list", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 },
      { slug: WITHDRAWN_SLUG, name: WITHDRAWN_NAME, quantity: 3 },
      { slug: SECOND_WITHDRAWN_SLUG, name: SECOND_WITHDRAWN_NAME, quantity: 1 },
    ],
  });
  await page.goto("/cart");

  await page
    .getByRole("button", { name: `Премахни ${WITHDRAWN_NAME}` })
    .click();

  await expect(cartRows(page)).toHaveCount(2);
  await expect(page.getByText(WITHDRAWN_LINES)).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Премахни ${SECOND_WITHDRAWN_NAME}` }),
  ).toBeFocused();
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
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/cart");

  await expect(page.getByText("Количката е празна.")).toBeVisible();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
});

test("a cart line stops at the maximum, says why and keeps focus", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 98 }],
  });
  await page.goto("/cart");

  const increase = page.getByRole("button", {
    name: `Увеличи количеството на ${POLLEN_NAME}`,
  });
  await increase.click();

  await expect(cartLink(page)).toHaveAccessibleName("Количка, 99 бр.");
  await expect(increase).toBeDisabled();
  await expect(increase).toBeFocused();
  await expect(increase).toHaveAccessibleDescription(
    "Това е максимумът за един продукт.",
  );
});

test("the add button stops at the maximum, says why and keeps focus", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 98 }],
  });
  await page.goto(`/products/${POLLEN_SLUG}`);

  const add = page.getByRole("button", { name: "Добави в количката" });
  await add.click();

  const cue = page.getByText("Добавено ✓");
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 99 бр.");
  await expect(cue).toBeHidden({ timeout: 3000 });

  await expect(add).toHaveAccessibleDescription(
    "99 бр. в количката — това е максимумът за един продукт.",
  );
  await expect(add).toBeDisabled();
  await expect(add).toBeFocused();

  await add.click({ force: true });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(await cue.isVisible()).toBe(false);
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 99 бр.");
});

for (const quantity of [0, -1, 1.5, 100]) {
  test(`a stored quantity of ${quantity} is discarded`, async ({ page }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity }],
    });
    await page.goto("/cart");

    await expect(page.getByText("Количката е празна.")).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
  });
}

test("the same product stored twice becomes one line", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 3 },
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

for (const [state, items, shown] of [
  ["an empty", [], "Количката е празна."],
  [
    "a filled",
    [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    "Към поръчката",
  ],
] as const) {
  test(`${state} cart does not shift the page once it has been read`, async ({
    page,
  }) => {
    await seedCart(page, { version: 2, items: [...items] });
    await page.addInitScript(() => {
      const shifts: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        shifts.push(...list.getEntries());
      });
      observer.observe({ type: "layout-shift", buffered: true });
      Object.assign(window, {
        layoutShift: () =>
          [...shifts, ...observer.takeRecords()].reduce(
            (total, entry) =>
              total + (entry as PerformanceEntry & { value: number }).value,
            0,
          ),
      });
    });

    await page.goto("/cart");
    await expect(page.getByText(shown, { exact: true })).toBeVisible();
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );

    const cls = await page.evaluate(() =>
      (window as Window & { layoutShift?: () => number }).layoutShift?.(),
    );
    expect(cls).toBeDefined();
    expect(cls).toBeLessThan(0.01);
  });
}
