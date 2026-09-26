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

const OFFICE_CITY = "Попово";
const OFFICE_STREET = "бул. България №117";
const OFFICE_HEADING = "Попово, офис Попово";

// Two offices in Попово, so they are listed outright and no search is needed.
async function chooseOffice(page: Page) {
  await page.getByLabel("Град", { exact: true }).fill(OFFICE_CITY);
  await page.getByRole("option", { name: OFFICE_CITY, exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Офиси на Еконт" })
    .locator("label")
    .filter({ hasText: OFFICE_STREET })
    .click();
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

test("the form is prerendered, disabled until the cart has been read", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  const response = await page.goto("/checkout");
  const html = await response?.text();

  expect(html).toMatch(/<fieldset disabled=""[^>]*>/);
  expect(html).toContain('name="email"');
  await expect(emailField(page)).toBeEnabled();
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

async function submittedIdempotencyKey(page: Page) {
  const request = page.waitForRequest(
    (sent) => sent.method() === "POST" && sent.url().endsWith("/checkout"),
  );
  await page.getByRole("button", { name: "Завърши поръчката" }).click();
  const body = (await request).postData() ?? "";

  return body.match(/name="(?:_\d+_)?idempotencyKey"\r\n\r\n([^\r]+)/)?.[1];
}

test("a resubmission reuses its page's idempotency key and a new page load mints another", async ({
  page,
}) => {
  await seedCart(page, {
    version: 1,
    items: [{ slug: POLLEN_SLUG, quantity: 1 }],
  });
  const response = await page.goto("/checkout");
  expect(await response?.text()).not.toContain("idempotencyKey");
  await fillContact(page, "not-an-email");

  const first = await submittedIdempotencyKey(page);
  await expect(page.getByText("Въведете валиден имейл адрес.")).toBeVisible();
  const resubmitted = await submittedIdempotencyKey(page);

  await page.reload();
  await fillContact(page, "not-an-email");
  const reloaded = await submittedIdempotencyKey(page);

  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(resubmitted).toBe(first);
  expect(reloaded).toMatch(/^[0-9a-f-]{36}$/);
  expect(reloaded).not.toBe(first);
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
    await chooseOffice(page);
    await page.getByRole("button", { name: "Завърши поръчката" }).click();

    await expect(page.getByText("Въведете валиден имейл адрес.")).toBeVisible();
    await expect(emailField(page)).toHaveAttribute("aria-invalid", "true");

    // The live region repeats the heading, so this is scoped to the panel.
    await expect(
      page.getByText("Избран офис", { exact: true }).locator("xpath=.."),
    ).toContainText(OFFICE_HEADING);

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

  test("an order with no office chosen is refused and says which field", async ({
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
      page.getByText("Изберете офис на Еконт, до който да получите поръчката."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toHaveCount(0);
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
    await chooseOffice(page);
    await page.getByRole("button", { name: "Завърши поръчката" }).click();

    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toBeVisible();
    await expect(page.getByText(/BP\d{5,}/)).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
  });
});
