import { expect, type Page, test } from "@playwright/test";

import { seedCart } from "./seed-cart";

const POLLEN_SLUG = "pchelen-prashets-500g";
const POLLEN_NAME = "Пчелен прашец 500 г";
const SECOND_SLUG = "pchelen-prashets-1kg";
const SECOND_NAME = "Пчелен прашец 1 кг";

function cartLink(page: Page) {
  return page.getByRole("banner").getByRole("link", { name: /Количка/ });
}

function summaryRows(page: Page) {
  return page.getByRole("main").getByRole("listitem");
}

function emailField(page: Page) {
  return page.getByLabel("Имейл", { exact: true });
}

async function fillContact(page: Page, email: string) {
  await page.getByLabel("Име и фамилия").fill("Мария Иванова");
  await emailField(page).fill(email);
  await page.getByLabel("Телефон").fill("0899777888");
  await page.getByLabel(/Съгласен съм с общите условия/).check();
}

test("the cart leads to the checkout page", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  await page.goto("/cart");

  await page.getByRole("link", { name: "Към поръчката" }).click();

  await expect(page).toHaveURL("/checkout");
  await expect(
    page.getByRole("heading", { level: 1, name: "Поръчка", exact: true }),
  ).toBeVisible();
});

test("an empty cart offers the catalogue instead of a form", async ({
  page,
}) => {
  await page.goto("/checkout");

  await expect(page.getByText("Количката е празна.")).toBeVisible();
  await expect(page.getByLabel("Име и фамилия")).toHaveCount(0);

  await page.getByRole("link", { name: "Към продуктите" }).click();
  await expect(page).toHaveURL("/");
});

test("the summary lists a line per product", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 2 },
      { slug: SECOND_SLUG, quantity: 1 },
    ],
  });
  await page.goto("/checkout");

  await expect(summaryRows(page)).toHaveCount(2);
  await expect(summaryRows(page).first()).toContainText(POLLEN_NAME);
  await expect(summaryRows(page).first()).toContainText("2 бр.");
  await expect(summaryRows(page).last()).toContainText(SECOND_NAME);
  await expect(page.getByText("94,90 €")).toBeVisible();
});

test("a withdrawn product is named rather than dropped", async ({ page }) => {
  await seedCart(page, {
    version: 1,
    items: [
      { slug: POLLEN_SLUG, quantity: 1 },
      { slug: "no-such-product", quantity: 1 },
    ],
  });
  await page.goto("/checkout");

  const withdrawn = summaryRows(page).filter({
    hasText: "Продуктът вече не се предлага",
  });

  await expect(withdrawn).toContainText("no-such-product");
  await expect(summaryRows(page)).toHaveCount(2);

  await expect(
    page.getByRole("button", { name: "Завърши поръчката" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Премахнете продуктите, които вече не се предлагат, за да продължите.",
    ),
  ).toBeVisible();

  await withdrawn.getByRole("button", { name: /Премахни/ }).click();

  await expect(summaryRows(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Завърши поръчката" }),
  ).toBeEnabled();
});

test("the consent wording is rendered as it will be stored", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  await page.goto("/checkout");

  await expect(
    page.getByText(
      "Съгласен съм с общите условия и политиката за поверителност.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Искам да получавам оферти и напомняния по имейл."),
  ).toBeVisible();
});

// Every submission spends one of five tokens per ten minutes per address, and a
// retry spends another, so these run in one project rather than both.
test.describe("placing an order", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  test("a refused submission keeps every answer", async ({ page }) => {
    await seedCart(page, {
      version: 1,
      items: [{ slug: POLLEN_SLUG, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "not-an-email");
    await page.getByRole("button", { name: "Завърши поръчката" }).click();

    await expect(page.getByText("Въведете валиден имейл адрес.")).toBeVisible();
    await expect(emailField(page)).toHaveAttribute("aria-invalid", "true");

    await expect(page.getByLabel("Име и фамилия")).toHaveValue("Мария Иванова");
    await expect(page.getByLabel("Телефон")).toHaveValue("0899777888");
    await expect(
      page.getByLabel(/Съгласен съм с общите условия/),
    ).toBeChecked();
    await expect(page.getByLabel("Име и фамилия")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("a placed order returns a reference and empties the cart", async ({
    page,
  }) => {
    await seedCart(page, {
      version: 1,
      items: [{ slug: POLLEN_SLUG, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "maria.ivanova@example.com");
    await page.getByRole("button", { name: "Завърши поръчката" }).click();

    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toBeVisible();
    await expect(page.getByText(/BP-\d{6}/)).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
  });
});
