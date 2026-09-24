import { expect, type Page, test } from "@playwright/test";

import { seedCart } from "./seed-cart";

const SMALL_CITY = "Попово";

// The row shows the office's full label; the chosen-office panel drops the
// city prefix the label repeats, so the two strings differ on purpose.
const SMALL_CITY_OFFICE_A = {
  heading: "Попово, офис Попово",
  street: "бул. България №117",
};
const SMALL_CITY_OFFICE_B = {
  heading: "Попово, офис Фотинова",
  street: "ул. Фотинова №2",
};

const LARGE_CITY = "Габрово";
const LARGE_CITY_TOTAL = "6 офиса";

const BIG_CITY = "София";
const BIG_CITY_TOTAL = "110 офиса";
const BIG_CITY_SEARCH_TERM = "Витоша";
const BIG_CITY_SEARCH_MATCHES = 3;

const SINGLE_OFFICE_CITY = "Ябланово";

// Two of the 590 offices carry no coordinates, so their directions link falls
// back to the address instead of a lat/lng pair.
const NO_COORDS_CITY = "Нови Искър";
const NO_COORDS_OFFICE_STREET = "кв. ЖП гара Курило ул. Търговска №18";

// The picker renders inside the order form, which a filled cart is what opens.
async function openPicker(page: Page) {
  await seedCart(page, {
    version: 1,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
  });
  await page.goto("/checkout");
}

// Exact, or it also matches the "Промени града …" button's aria-label.
function cityInput(page: Page) {
  return page.getByLabel("Град", { exact: true });
}

async function chooseCity(page: Page, name: string) {
  await cityInput(page).fill(name);
  await page.getByRole("button", { name, exact: true }).click();
}

function officeSearchInput(page: Page) {
  return page.getByLabel("Офис — улица, квартал или име");
}

function officeGroup(page: Page) {
  return page.getByRole("radiogroup", { name: "Офиси на Еконт" });
}

function officeRow(page: Page, street: string) {
  return officeGroup(page).locator("label").filter({ hasText: street });
}

function statusLine(page: Page) {
  return page.locator('[aria-live="polite"]');
}

// The street is printed both in the list row and in the chosen-office panel,
// so panel assertions have to be scoped to the panel.
function selectedPanel(page: Page) {
  return page.getByText("Избран офис", { exact: true }).locator("xpath=..");
}

test("typing in the city field lists matching Bulgarian cities, and reports when none match", async ({
  page,
}) => {
  await openPicker(page);

  await cityInput(page).fill("поп");
  await expect(
    page.getByRole("button", { name: SMALL_CITY, exact: true }),
  ).toBeVisible();

  await cityInput(page).fill("не съществува такъв град");
  await expect(
    page.getByText("Няма град с това име в списъка на Еконт."),
  ).toBeVisible();
});

test("choosing a city replaces the field with a summary panel", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);

  await expect(cityInput(page)).toHaveCount(0);
  await expect(page.getByText(`Град: ${SMALL_CITY}`)).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Промени града ${SMALL_CITY}` }),
  ).toHaveText("Промени");
});

test("a small city lists its offices outright, with no search field", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);

  await expect(officeSearchInput(page)).toHaveCount(0);
  await expect(officeRow(page, SMALL_CITY_OFFICE_A.street)).toBeVisible();
  await expect(officeRow(page, SMALL_CITY_OFFICE_B.street)).toBeVisible();
  await expect(statusLine(page)).toHaveText(`2 офиса в ${SMALL_CITY}`);
});

test("a large city needs a search before any office is listed", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, LARGE_CITY);

  await expect(officeSearchInput(page)).toBeVisible();
  await expect(officeGroup(page).getByRole("radio")).toHaveCount(0);
  await expect(statusLine(page)).toHaveText(
    `${LARGE_CITY_TOTAL} в ${LARGE_CITY} — въведете улица, квартал или име, или натиснете на картата избрания от вас офис.`,
  );
});

test("typing in the office search filters the list", async ({ page }) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);

  await expect(officeGroup(page).getByRole("radio")).toHaveCount(
    BIG_CITY_SEARCH_MATCHES,
  );
  await expect(statusLine(page)).toHaveText(
    `${BIG_CITY_SEARCH_MATCHES} офиса в ${BIG_CITY}`,
  );
});

test("an office search with no matches shows a message", async ({ page }) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill("zzzzzz");

  await expect(officeGroup(page).getByRole("radio")).toHaveCount(0);
  await expect(statusLine(page)).toHaveText("Няма офис с това име.");
});

test("choosing an office shows its details and a directions link", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);
  await officeRow(page, SMALL_CITY_OFFICE_A.street).click();

  await expect(selectedPanel(page)).toContainText(SMALL_CITY_OFFICE_A.heading);
  await expect(selectedPanel(page)).toContainText(SMALL_CITY_OFFICE_A.street);

  await expect(
    selectedPanel(page).getByRole("link", { name: "Упътване до офиса" }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+(\.\d+)?%2C-?\d+(\.\d+)?$/,
  );
});

test("choosing an office hides the search field and the office count", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);
  await officeGroup(page).getByRole("radio").first().click();

  await expect(officeSearchInput(page)).toHaveCount(0);
  await expect(statusLine(page)).toHaveText("");
  await expect(page.getByText("Избран офис")).toBeVisible();
});

test("Изчисти clears only the office, leaving the city selected", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);
  await officeRow(page, SMALL_CITY_OFFICE_A.street).click();

  await page.getByRole("button", { name: "Изчисти избрания офис" }).click();

  await expect(page.getByText("Избран офис")).toHaveCount(0);
  await expect(page.getByText(`Град: ${SMALL_CITY}`)).toBeVisible();
  await expect(officeRow(page, SMALL_CITY_OFFICE_A.street)).toBeVisible();
  await expect(officeRow(page, SMALL_CITY_OFFICE_B.street)).toBeVisible();
  await expect(statusLine(page)).toHaveText(`2 офиса в ${SMALL_CITY}`);
});

test("clearing a chosen office in a large city brings back the search that found it", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);
  await officeGroup(page).getByRole("radio").first().click();

  await page.getByRole("button", { name: "Изчисти избрания офис" }).click();

  await expect(officeSearchInput(page)).toHaveValue(BIG_CITY_SEARCH_TERM);
  await expect(statusLine(page)).toHaveText(
    `${BIG_CITY_SEARCH_MATCHES} офиса в ${BIG_CITY}`,
  );
});

test("a chosen office in a large city can be swapped for another from the list", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);

  const rows = officeGroup(page).getByRole("radio");

  await rows.first().click();

  await expect(officeSearchInput(page)).toHaveCount(0);
  await expect(rows).toHaveCount(BIG_CITY_SEARCH_MATCHES);

  await rows.nth(1).click();

  await expect(rows.nth(1)).toBeChecked();
  await expect(selectedPanel(page)).toBeVisible();
});

test("a city with a single office lists it without a search field", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SINGLE_OFFICE_CITY);

  await expect(officeSearchInput(page)).toHaveCount(0);
  await expect(officeGroup(page).getByRole("radio")).toHaveCount(1);
  await expect(statusLine(page)).toHaveText(`1 офис в ${SINGLE_OFFICE_CITY}`);
});

test("an office with no coordinates falls back to its address for directions", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, NO_COORDS_CITY);
  await officeRow(page, NO_COORDS_OFFICE_STREET).click();

  const href = await selectedPanel(page)
    .getByRole("link", { name: "Упътване до офиса" })
    .getAttribute("href");

  expect(href).toContain(encodeURIComponent(NO_COORDS_CITY));
  expect(href).not.toContain("%2C");
});

test("the offices list stays visible after a choice, so another can be picked", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);
  await officeRow(page, SMALL_CITY_OFFICE_A.street).click();

  await expect(officeRow(page, SMALL_CITY_OFFICE_B.street)).toBeVisible();
  await officeRow(page, SMALL_CITY_OFFICE_B.street).click();

  await expect(selectedPanel(page)).toContainText(SMALL_CITY_OFFICE_B.heading);
  await expect(
    officeRow(page, SMALL_CITY_OFFICE_B.street).getByRole("radio"),
  ).toBeChecked();
});

test("Промени clears the city, the office and both queries", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);
  await officeGroup(page).getByRole("radio").first().click();

  await page.getByRole("button", { name: `Промени града ${BIG_CITY}` }).click();

  await expect(cityInput(page)).toHaveValue("");
  await expect(page.getByText("Избран офис")).toHaveCount(0);
  await expect(officeGroup(page)).toHaveCount(0);

  await chooseCity(page, BIG_CITY);

  await expect(officeSearchInput(page)).toHaveValue("");
  await expect(statusLine(page)).toHaveText(
    `${BIG_CITY_TOTAL} в ${BIG_CITY} — въведете улица, квартал или име, или натиснете на картата избрания от вас офис.`,
  );
});
