import { expect, type Page, test } from "@playwright/test";

import { CONSENT_WORDING } from "@/lib/consent";

import { seedCart } from "./seed-cart";

const POLLEN_SLUG = "pchelen-prashets-500g";
const POLLEN_NAME = "Пчелен прашец 500 г";
const SECOND_SLUG = "pchelen-prashets-1kg";
const SECOND_NAME = "Пчелен прашец 1 кг";
const WITHDRAWN_NAME = "Пчелен прашец 2 кг";
const SECOND_WITHDRAWN_NAME = "Пчелен прашец 3 кг";

function cartLink(page: Page) {
  return page.getByRole("banner").getByRole("link", { name: /Количка/ });
}

function summaryRows(page: Page) {
  return page.getByRole("main").getByRole("listitem");
}

async function showSummary(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: /^Вашата поръчка/ }).click();
  }
}

function confirmation(page: Page) {
  return page.getByRole("region", { name: "Потвърждение" });
}

function emailField(page: Page) {
  return page.getByLabel("Имейл", { exact: true });
}

const OFFICE_CITY = "Павликени";
const OFFICE_STREET = "пл. Стефан Караджа №16 (до Магазин Абсолют плюс)";
const OFFICE_HEADING = "Павликени, офис Павликени";

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
  await page.getByLabel("Телефон", { exact: true }).fill("0899777888");
  await page
    .getByRole("checkbox", { name: CONSENT_WORDING.TERMS, exact: true })
    .check();
}

test("the cart leads to the checkout page", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/cart");

  await page.getByRole("link", { name: "Към поръчката" }).click();

  await expect(page).toHaveURL("/checkout");
  await expect(
    page.getByRole("heading", { level: 1, name: "Поръчка", exact: true }),
  ).toBeVisible();
});

test("the checkout leads back to the cart with its lines intact", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 }],
  });
  await page.goto("/checkout");

  await page.getByRole("link", { name: "Обратно към количката" }).click();

  await expect(page).toHaveURL("/cart");
  await expect(
    page.getByRole("button", {
      name: `Намали количеството на ${POLLEN_NAME}`,
    }),
  ).toBeVisible();
  await expect(cartLink(page)).toHaveAccessibleName("Количка, 2 бр.");
});

function offersBox(page: Page) {
  return page.getByRole("checkbox", {
    name: CONSENT_WORDING.OFFERS,
    exact: true,
  });
}

function termsBox(page: Page) {
  return page.getByRole("checkbox", {
    name: CONSENT_WORDING.TERMS,
    exact: true,
  });
}

function chosenOffice(page: Page) {
  return page.getByText("Избран офис", { exact: true }).locator("xpath=..");
}

async function expectContactKept(page: Page) {
  await expect(page.getByLabel("Име и фамилия")).toHaveValue("Мария Иванова");
  await expect(emailField(page)).toHaveValue("maria.ivanova@example.com");
  await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue(
    "0899777888",
  );
}

async function roundTripThroughCart(page: Page) {
  await page.getByRole("link", { name: "Обратно към количката" }).click();
  await expect(page).toHaveURL("/cart");
  await page.getByRole("link", { name: "Към поръчката" }).click();
  await expect(page).toHaveURL("/checkout");
}

test("answers survive a round trip to the cart, while both consents come back unticked", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  await fillContact(page, "maria.ivanova@example.com");
  await offersBox(page).check();
  await chooseOffice(page);
  await roundTripThroughCart(page);

  await expectContactKept(page);
  await expect(chosenOffice(page)).toContainText(OFFICE_HEADING);
  await expect(termsBox(page)).not.toBeChecked();
  await expect(offersBox(page)).not.toBeChecked();
});

test("answers survive a reload of the checkout", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  await fillContact(page, "maria.ivanova@example.com");
  await chooseOffice(page);
  await page.reload();

  await expectContactKept(page);
  await expect(chosenOffice(page)).toContainText(OFFICE_HEADING);
});

test("a chosen city with no office yet is kept, and so is local delivery", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  await page.getByLabel("Град", { exact: true }).fill(OFFICE_CITY);
  await page.getByRole("option", { name: OFFICE_CITY, exact: true }).click();
  await roundTripThroughCart(page);

  await expect(
    page.getByRole("button", { name: `Промени града ${OFFICE_CITY}` }),
  ).toBeVisible();
  await expect(page.getByLabel("Град", { exact: true })).toHaveCount(0);

  await page.getByLabel(/Поръчката е за гр\. Попово/).check();
  await roundTripThroughCart(page);

  await expect(page.getByLabel(/Поръчката е за гр\. Попово/)).toBeChecked();
});

async function seedDraft(page: Page, city: string, officeCode: string) {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.addInitScript(
    (stored) => sessionStorage.setItem("beepollen.checkout", stored),
    JSON.stringify({
      version: 1,
      name: "Мария Иванова",
      email: "maria.ivanova@example.com",
      phone: "0899777888",
      localDelivery: false,
      city,
      officeCode,
    }),
  );
}

test("a kept city no longer in the list is dropped with its office", async ({
  page,
}) => {
  await seedDraft(page, "Несъществуващ", "99999");
  await page.goto("/checkout");

  await expectContactKept(page);
  await expect(page.getByLabel("Град", { exact: true })).toBeVisible();
  await expect(chosenOffice(page)).toHaveCount(0);
});

test("a kept office no longer in the list is dropped while its city stays", async ({
  page,
}) => {
  await seedDraft(page, OFFICE_CITY, "99999");
  await page.goto("/checkout");

  await expectContactKept(page);
  await expect(
    page.getByRole("button", { name: `Промени града ${OFFICE_CITY}` }),
  ).toBeVisible();
  await expect(chosenOffice(page)).toHaveCount(0);
});

test("a form left empty keeps nothing in the browser", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");
  await page.getByLabel("Име и фамилия").fill("М");
  await page.getByLabel("Име и фамилия").fill("");
  await page.reload();
  await expect(emailField(page)).toBeEnabled();

  expect(
    await page.evaluate(() => sessionStorage.getItem("beepollen.checkout")),
  ).toBeNull();
});

test("blocked browser storage leaves the checkout working", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    Object.defineProperty(window, "sessionStorage", { get: refuse });
  });
  await page.goto("/checkout");

  await expect(emailField(page)).toBeEnabled();
  await fillContact(page, "maria.ivanova@example.com");
  await chooseOffice(page);

  await expect(emailField(page)).toHaveValue("maria.ivanova@example.com");
  await expect(chosenOffice(page)).toContainText(OFFICE_HEADING);
  expect(errors).toEqual([]);
});

test("a new tab starts with an empty form", async ({ page, context }) => {
  const cart = {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  };

  await seedCart(page, cart);
  await page.goto("/checkout");
  await fillContact(page, "maria.ivanova@example.com");
  await page.reload();
  await expect(emailField(page)).toHaveValue("maria.ivanova@example.com");

  const other = await context.newPage();
  await seedCart(other, cart);
  await other.goto("/checkout");

  await expect(emailField(other)).toBeEnabled();
  await expect(emailField(other)).toHaveValue("");
  await expect(other.getByLabel("Име и фамилия")).toHaveValue("");
});

test("the form is prerendered, disabled until the cart has been read", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
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

test("the summary lists a line per product", async ({ page, isMobile }) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await showSummary(page, isMobile);

  await expect(summaryRows(page)).toHaveCount(2);
  await expect(summaryRows(page).first()).toContainText(POLLEN_NAME);
  await expect(summaryRows(page).first()).toContainText("2 бр.");
  await expect(summaryRows(page).last()).toContainText(SECOND_NAME);
  await expect(page.getByText("5,90 €", { exact: true })).toBeVisible();
  await expect(confirmation(page)).toContainText("100,80 €");
});

test("on a phone the summary starts folded and names the item count and total", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The summary folds on a phone only.");
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
    ],
  });
  await page.goto("/checkout");

  const toggle = page.getByRole("button", {
    name: "Вашата поръчка · 3 бр. · 100,80 €",
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(summaryRows(page)).toHaveCount(0);

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(summaryRows(page)).toHaveCount(2);
});

test("local delivery in Popovo drops the office picker and the delivery charge", async ({
  page,
  isMobile,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 2 },
      { slug: SECOND_SLUG, name: SECOND_NAME, quantity: 1 },
    ],
  });
  await page.goto("/checkout");
  await showSummary(page, isMobile);
  const dispatchNote = page.getByText(/^Изпращаме в деня на поръчката/);
  await expect(dispatchNote).toBeVisible();
  await chooseOffice(page);
  await expect(chosenOffice(page)).toBeVisible();

  const popovo = page.getByLabel(/Поръчката е за гр\. Попово/);
  const top = () =>
    popovo.evaluate((box) => box.getBoundingClientRect().top + window.scrollY);
  const before = await top();
  await popovo.check();

  await expect(dispatchNote).toBeHidden();
  expect(await top()).toBe(before);
  await expect(page.getByLabel("Град", { exact: true })).toBeHidden();
  await expect(page.getByText("Безплатна", { exact: true })).toBeVisible();
  await expect(confirmation(page)).toContainText("94,90 €");

  await popovo.uncheck();

  await expect(page.getByLabel("Град", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Град", { exact: true })).toHaveValue("");
  await expect(chosenOffice(page)).toBeHidden();
  await expect(confirmation(page)).toContainText("100,80 €");
});

test("a withdrawn product is named and left out of the total", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 },
      { slug: "no-such-product", name: "Пчелен прашец 2 кг", quantity: 3 },
    ],
  });
  await page.goto("/checkout");

  const withdrawn = summaryRows(page).filter({
    hasText: "Пчелен прашец 2 кг",
  });

  await expect(withdrawn.locator("p").first()).toHaveText("Пчелен прашец 2 кг");
  await expect(withdrawn).toContainText("Вече не се предлага");
  await expect(withdrawn).not.toContainText("no-such-product");
  await expect(summaryRows(page)).toHaveCount(2);
  await expect(confirmation(page)).toContainText("30,40 €");

  await expect(
    page.getByRole("button", { name: "Поръчай с плащане при доставка" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Премахнете продуктите, които вече не се предлагат, за да продължите.",
    ),
  ).toBeVisible();

  await withdrawn.getByRole("button", { name: /Премахни/ }).click();

  await expect(summaryRows(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Поръчай с плащане при доставка" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: /^Вашата поръчка/ }),
  ).toBeFocused();
});

for (const [removed, focused] of [
  [WITHDRAWN_NAME, SECOND_WITHDRAWN_NAME],
  [SECOND_WITHDRAWN_NAME, WITHDRAWN_NAME],
] as const) {
  test(`removing ${removed} moves focus to the remove button of ${focused}`, async ({
    page,
  }) => {
    await seedCart(page, {
      version: 2,
      items: [
        { slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 },
        { slug: "no-such-product", name: WITHDRAWN_NAME, quantity: 3 },
        {
          slug: "no-such-product-either",
          name: SECOND_WITHDRAWN_NAME,
          quantity: 1,
        },
      ],
    });
    await page.goto("/checkout");

    await page.getByRole("button", { name: `Премахни ${removed}` }).click();

    await expect(summaryRows(page)).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: `Премахни ${focused}` }),
    ).toBeFocused();
  });
}

test("removing the last line moves focus to the empty cart", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: "no-such-product", name: WITHDRAWN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  await page
    .getByRole("button", { name: `Премахни ${WITHDRAWN_NAME}` })
    .click();

  await expect(
    page.getByRole("heading", { name: "Количката е празна." }),
  ).toBeFocused();
});

test("an order with nothing left to buy totals zero, with no delivery charge", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [
      { slug: "no-such-product", name: "Пчелен прашец 2 кг", quantity: 1 },
    ],
  });
  await page.goto("/checkout");

  await expect(summaryRows(page)).toHaveCount(1);
  await expect(confirmation(page)).toContainText("Общо0,00 €");
});

test("the unticked terms box is not reported invalid before a submission", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  const terms = page.getByRole("checkbox", {
    name: CONSENT_WORDING.TERMS,
    exact: true,
  });
  await expect(terms).toBeEnabled();

  expect(await terms.evaluate((box) => box.matches(":invalid"))).toBe(false);
  await expect(terms).not.toHaveAttribute("aria-invalid");
  await expect(terms).toHaveAttribute("aria-required", "true");
});

test("the consent wording is rendered as it will be stored", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  await expect(
    page.getByRole("checkbox", { name: CONSENT_WORDING.TERMS, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: CONSENT_WORDING.OFFERS, exact: true }),
  ).toBeVisible();
});

test("the terms and the privacy policy are one click from the order button, which names the obligation to pay", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");

  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: "общите условия", exact: true }),
  ).toHaveAttribute("href", "/terms");
  await expect(
    main.getByRole("link", { name: "Политика за поверителност", exact: true }),
  ).toHaveAttribute("href", "/privacy");
  await expect(
    main.getByRole("button", {
      name: "Поръчай с плащане при доставка",
      exact: true,
    }),
  ).toBeVisible();
});

async function submittedIdempotencyKey(page: Page) {
  const request = page.waitForRequest(
    (sent) => sent.method() === "POST" && sent.url().endsWith("/checkout"),
  );
  await page
    .getByRole("button", { name: "Поръчай с плащане при доставка" })
    .click();
  const body = (await request).postData() ?? "";

  return body.match(/name="(?:_\d+_)?idempotencyKey"\r\n\r\n([^\r]+)/)?.[1];
}

test("a resubmission reuses its page's idempotency key and a new page load mints another", async ({
  page,
}) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
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

test("two clicks landing together send the order once", async ({ page }) => {
  await seedCart(page, {
    version: 2,
    items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
  });
  await page.goto("/checkout");
  await fillContact(page, "not-an-email");

  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  const submit = page.getByRole("button", {
    name: "Поръчай с плащане при доставка",
  });
  await submit.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });

  await expect(page.getByText("Въведете валиден имейл адрес.")).toBeVisible();
  await expect(submit).toBeEnabled();
  expect(posts).toHaveLength(1);
});

test.describe("placing an order", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "Ordering is rate limited, so it is exercised in the mobile project only.",
  );

  test("a refused submission keeps every answer", async ({ page }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "not-an-email");
    await chooseOffice(page);
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    await expect(page.getByText("Въведете валиден имейл адрес.")).toBeVisible();
    await expect(emailField(page)).toHaveAttribute("aria-invalid", "true");

    await expect(
      page.getByText("Избран офис", { exact: true }).locator("xpath=.."),
    ).toContainText(OFFICE_HEADING);

    await expect(page.getByLabel("Име и фамилия")).toHaveValue("Мария Иванова");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue(
      "0899777888",
    );
    await expect(
      page.getByRole("checkbox", { name: CONSENT_WORDING.TERMS, exact: true }),
    ).toBeChecked();
    await expect(page.getByLabel("Име и фамилия")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await page.reload();

    await expect(page.getByLabel("Име и фамилия")).toHaveValue("Мария Иванова");
    await expect(emailField(page)).toHaveValue("not-an-email");
  });

  test("an order with no office chosen is refused and says which field", async ({
    page,
  }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "maria.ivanova@example.com");
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    const officeRequired = page.getByText(
      "Изберете офис на Еконт, до който да получите поръчката.",
    );

    await expect(officeRequired).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toHaveCount(0);

    const cityField = page.getByLabel("Град", { exact: true });
    await expect(cityField).toHaveAttribute("aria-invalid", "true");
    await expect(cityField).toHaveAccessibleDescription(
      "Изберете офис на Еконт, до който да получите поръчката.",
    );

    await page.getByLabel(/Поръчката е за гр\. Попово/).check();

    await expect(officeRequired).toHaveCount(0);
  });

  test("a missing office is described on the office list or search still waiting for a choice", async ({
    page,
  }) => {
    const officeRequired =
      "Изберете офис на Еконт, до който да получите поръчката.";
    const offices = page.getByRole("radiogroup", { name: "Офиси на Еконт" });
    const search = page.getByLabel("Офис — улица, квартал или име");

    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");
    await fillContact(page, "maria.ivanova@example.com");

    await page.getByLabel("Град", { exact: true }).fill(OFFICE_CITY);
    await page.getByRole("option", { name: OFFICE_CITY, exact: true }).click();
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    await expect(offices).toHaveAttribute("aria-invalid", "true");
    await expect(offices).toHaveAccessibleDescription(officeRequired);

    await offices.locator("label").filter({ hasText: OFFICE_STREET }).click();
    await expect(offices).toHaveCount(0);
    await expect(page.getByText(officeRequired)).toHaveCount(0);

    await page.getByRole("button", { name: /Промени града/ }).click();
    await page.getByLabel("Град", { exact: true }).fill("Габрово");
    await page.getByRole("option", { name: "Габрово", exact: true }).click();
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    await expect(search).toHaveAttribute("aria-invalid", "true");
    await expect(search).toHaveAccessibleDescription(officeRequired);
    await expect(offices).not.toHaveAttribute("aria-invalid");
    await expect(page.getByText(officeRequired)).toHaveCount(1);
  });

  test("a local order is placed with no office and no delivery charge", async ({
    page,
  }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "maria.ivanova@example.com");
    await page.getByLabel(/Поръчката е за гр\. Попово/).check();
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toBeVisible();
    await expect(page.getByText("24,50 €", { exact: true })).toBeVisible();
  });

  test("a placed order returns a reference and empties the cart", async ({
    page,
  }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "maria.ivanova@example.com");
    await chooseOffice(page);
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toBeVisible();
    await expect(page.getByText(/BP\d{7,}/)).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName("Количка, празна");
  });

  test("an accepted order clears the kept answers", async ({ page }) => {
    await seedCart(page, {
      version: 2,
      items: [{ slug: POLLEN_SLUG, name: POLLEN_NAME, quantity: 1 }],
    });
    await page.goto("/checkout");

    await fillContact(page, "maria.ivanova@example.com");
    await chooseOffice(page);
    await page
      .getByRole("button", { name: "Поръчай с плащане при доставка" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Поръчката е приета" }),
    ).toBeVisible();

    await page.goto("/checkout");

    await expect(emailField(page)).toBeEnabled();
    await expect(emailField(page)).toHaveValue("");
    await expect(page.getByLabel("Име и фамилия")).toHaveValue("");
    await expect(page.getByLabel("Град", { exact: true })).toBeVisible();
  });
});
