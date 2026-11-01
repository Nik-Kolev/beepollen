import { expect, type Page, test } from "@playwright/test";

import {
  BIG_CITY,
  BIG_CITY_OFFICES,
  BIG_CITY_SEARCH_MATCHES,
  BIG_CITY_SEARCH_TERM,
  LARGE_CITY,
  LARGE_CITY_OFFICES,
  NO_COORDS_CITY,
  NO_COORDS_OFFICE_STREET,
  SINGLE_OFFICE_CITY,
  SMALL_CITY,
  SMALL_CITY_OFFICE_A,
  SMALL_CITY_OFFICE_B,
} from "../tests/support/fixture-offices";
import { seedCart } from "./seed-cart";

const SMALL_CITY_QUERY = "пробна ма";
const LARGE_CITY_TOTAL = `${LARGE_CITY_OFFICES} офиса`;
const BIG_CITY_TOTAL = `${BIG_CITY_OFFICES} офиса`;

const OFFICE_REQUIRED =
  "Изберете офис на Еконт, до който да получите поръчката.";

async function openPicker(page: Page) {
  await seedCart(page, {
    version: 2,
    items: [
      {
        slug: "pchelen-prashets-500g",
        name: "Пчелен прашец 500 г",
        quantity: 1,
      },
    ],
  });
  await page.goto("/checkout");
}

function cityInput(page: Page) {
  return page.getByLabel("Град", { exact: true });
}

async function chooseCity(page: Page, name: string) {
  await cityInput(page).fill(name);
  await page.getByRole("option", { name, exact: true }).click();
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

function selectedPanel(page: Page) {
  return page.getByText("Избран офис", { exact: true }).locator("xpath=..");
}

test("typing in the city field lists matching Bulgarian cities, and reports when none match", async ({
  page,
}) => {
  await openPicker(page);

  await cityInput(page).fill(SMALL_CITY_QUERY);
  await expect(
    page.getByRole("option", { name: SMALL_CITY, exact: true }),
  ).toBeVisible();

  await cityInput(page).fill("не съществува такъв град");
  await expect(
    page.getByText("Няма град с това име в списъка на Еконт."),
  ).toBeVisible();
});

test("the map is drawn only once a city is chosen", async ({ page }) => {
  const mapScripts: string[] = [];
  const reads: Promise<void>[] = [];
  page.on("response", (response) => {
    if (!response.url().endsWith(".js")) return;
    reads.push(
      response.text().then((body) => {
        if (body.includes("leaflet-container")) mapScripts.push(response.url());
      }),
    );
  });
  await openPicker(page);
  await page.waitForLoadState("networkidle");
  await Promise.all(reads);
  expect(mapScripts).toEqual([]);
  expect(await page.locator(".leaflet-container").count()).toBe(0);

  await cityInput(page).fill("Ва");
  const option = page.getByRole("option").nth(3);
  const name = await option.innerText();
  await option.click();

  await expect(page.getByText(`Град: ${name}`)).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await Promise.all(reads);
  expect(mapScripts).not.toEqual([]);
});

test("Popovo is not offered as an Econt city, since its orders are delivered in person", async ({
  page,
}) => {
  await openPicker(page);

  await cityInput(page).fill("Попово");
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
  await expect(statusLine(page)).toHaveText(`2 офиса в ${SMALL_CITY}.`);
});

test("a large city needs a search before any office is listed", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, LARGE_CITY);

  await expect(officeSearchInput(page)).toBeVisible();
  await expect(officeGroup(page).getByRole("radio")).toHaveCount(0);
  await expect(statusLine(page)).toHaveText(
    `${LARGE_CITY_TOTAL} в ${LARGE_CITY} — въведете улица, квартал, име или изберете офис на картата.`,
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
    `${BIG_CITY_SEARCH_MATCHES} офиса в ${BIG_CITY}.`,
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
  await expect(statusLine(page)).toContainText("Избрахте");
  await expect(page.getByText("Избран офис")).toBeVisible();
});

function changeOfficeButton(page: Page) {
  return page.getByRole("button", { name: /^Промени офиса / });
}

test("Промени on the chosen office clears only the office, leaving the city selected", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);
  await officeRow(page, SMALL_CITY_OFFICE_A.street).click();

  await changeOfficeButton(page).click();

  await expect(page.getByText("Избран офис")).toHaveCount(0);
  await expect(page.getByText(`Град: ${SMALL_CITY}`)).toBeVisible();
  await expect(officeRow(page, SMALL_CITY_OFFICE_A.street)).toBeVisible();
  await expect(officeRow(page, SMALL_CITY_OFFICE_B.street)).toBeVisible();
  await expect(statusLine(page)).toHaveText(`2 офиса в ${SMALL_CITY}.`);
});

test("clearing a chosen office in a large city brings back the search that found it", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);
  await officeGroup(page).getByRole("radio").first().click();

  await changeOfficeButton(page).click();

  await expect(officeSearchInput(page)).toHaveValue(BIG_CITY_SEARCH_TERM);
  await expect(statusLine(page)).toHaveText(
    `${BIG_CITY_SEARCH_MATCHES} офиса в ${BIG_CITY}.`,
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
  await expect(rows).toHaveCount(0);

  await changeOfficeButton(page).click();
  await expect(rows).toHaveCount(BIG_CITY_SEARCH_MATCHES);

  const secondStreet = (
    await officeGroup(page).locator("label").nth(1).innerText()
  )
    .split("\n")[1]
    .trim();

  await rows.nth(1).click();

  await expect(selectedPanel(page)).toContainText(secondStreet);
});

test("a city with a single office lists it without a search field", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SINGLE_OFFICE_CITY);

  await expect(officeSearchInput(page)).toHaveCount(0);
  await expect(officeGroup(page).getByRole("radio")).toHaveCount(1);
  await expect(statusLine(page)).toHaveText(`1 офис в ${SINGLE_OFFICE_CITY}.`);
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
    `${BIG_CITY_TOTAL} в ${BIG_CITY} — въведете улица, квартал, име или изберете офис на картата.`,
  );
});

test("the city field reports itself as a combobox and closes on Escape", async ({
  page,
}) => {
  await openPicker(page);

  await expect(cityInput(page)).toHaveAttribute("aria-expanded", "false");

  await cityInput(page).fill(SMALL_CITY_QUERY);
  await expect(cityInput(page)).toHaveAttribute("aria-expanded", "true");

  await cityInput(page).press("Escape");

  await expect(cityInput(page)).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("option", { name: SMALL_CITY, exact: true }),
  ).toBeHidden();
});

test("a city can be chosen with the arrow keys and Enter", async ({ page }) => {
  await openPicker(page);

  await cityInput(page).fill(SMALL_CITY_QUERY);
  await cityInput(page).press("ArrowDown");

  await expect(
    page.getByRole("option", { name: SMALL_CITY, exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await cityInput(page).press("Enter");

  await expect(
    page.getByRole("button", { name: `Промени града ${SMALL_CITY}` }),
  ).toBeVisible();
});

test("the city the arrow keys reach is scrolled into the list's view", async ({
  page,
}) => {
  await openPicker(page);

  await cityInput(page).fill("с");
  for (let step = 0; step < 12; step += 1) {
    await cityInput(page).press("ArrowDown");
  }

  const active = page.locator('[role="option"][aria-selected="true"]');
  await expect(active).toHaveAttribute("id", /-11$/);
  await expect(active).toBeInViewport({ ratio: 1 });
});

test("choosing a city moves focus on to the control that continues the choice", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, BIG_CITY);

  await expect(officeSearchInput(page)).toBeFocused();

  await page.getByRole("button", { name: `Промени града ${BIG_CITY}` }).click();

  await expect(cityInput(page)).toBeFocused();

  await chooseCity(page, SMALL_CITY);

  await expect(officeGroup(page).getByRole("radio").first()).toBeFocused();
});

test("clicking an office announces it to screen readers only and moves focus to its Промени", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);
  await officeRow(page, SMALL_CITY_OFFICE_A.street).click();

  await expect(statusLine(page)).toHaveText(
    `Избрахте ${SMALL_CITY_OFFICE_A.heading}, ${SMALL_CITY_OFFICE_A.street}.`,
  );
  await expect(statusLine(page)).toHaveClass("sr-only");
  await expect(changeOfficeButton(page)).toBeFocused();
});

test("the office list stays open while the arrow keys walk it, and collapses on Tab", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);

  const radios = officeGroup(page).getByRole("radio");

  await radios.first().press("ArrowDown");

  await expect(radios).toHaveCount(2);
  await expect(selectedPanel(page)).toHaveCount(0);
  await expect(statusLine(page)).not.toHaveClass("sr-only");

  await radios.nth(1).press("Tab");

  await expect(officeGroup(page)).toHaveCount(0);
  await expect(selectedPanel(page)).toContainText(SMALL_CITY_OFFICE_B.heading);
});

test("the arrow keys walk the office list without focus leaving it", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);

  const radios = officeGroup(page).getByRole("radio");

  await expect(radios.first()).toBeFocused();

  await radios.first().press("ArrowDown");

  await expect(radios.nth(1)).toBeFocused();
  await expect(radios.nth(1)).toBeChecked();

  await radios.nth(1).press("ArrowUp");

  await expect(radios.first()).toBeFocused();
  await expect(radios.first()).toBeChecked();
});

test("Enter in a picker field never submits the order", async ({ page }) => {
  await openPicker(page);

  const posts: string[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  await cityInput(page).fill("зззз");
  await cityInput(page).press("Enter");
  await page.waitForLoadState("networkidle");

  await chooseCity(page, BIG_CITY);
  await officeSearchInput(page).fill(BIG_CITY_SEARCH_TERM);
  await officeSearchInput(page).press("Enter");
  await page.waitForLoadState("networkidle");

  expect(posts).toEqual([]);
  await expect(page.getByText(OFFICE_REQUIRED)).toHaveCount(0);
  await expect(officeSearchInput(page)).toHaveValue(BIG_CITY_SEARCH_TERM);
});

test("Enter on an office in the list never submits the order", async ({
  page,
}) => {
  await openPicker(page);
  await chooseCity(page, SMALL_CITY);

  const posts: string[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  const radio = officeGroup(page).getByRole("radio").first();
  await radio.focus();
  await radio.press("Enter");
  await page.waitForLoadState("networkidle");

  expect(posts).toEqual([]);
});
