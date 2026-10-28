import { expect, type Locator, type Page, test } from "@playwright/test";

const WORDMARK = /^Д & Н Димитрови\s+пчелни продукти$/i;

function header(page: Page) {
  return page.getByRole("banner");
}

function wordmark(page: Page) {
  return header(page).getByRole("link", { name: /Димитрови/ });
}

function emblem(page: Page) {
  return header(page).locator('a[href="/"][aria-hidden="true"]');
}

function cartLink(page: Page) {
  return header(page).getByRole("link", { name: /Количка/ });
}

function cartBee(page: Page) {
  return cartLink(page).locator("svg").last();
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();

  if (!bounds) throw new Error("The element has no box.");

  return bounds;
}

function isFocused(locator: Locator) {
  return locator.evaluate((element) => element === document.activeElement);
}

test("the wordmark is the header's only accessible home link", async ({
  page,
}) => {
  await page.goto("/");

  await expect(wordmark(page)).toHaveAccessibleName(WORDMARK);
  await expect(wordmark(page)).toHaveAttribute("href", "/");
  await expect(header(page).getByRole("link")).toHaveCount(2);
  await expect(emblem(page)).toHaveCount(1);
  await expect(emblem(page)).toBeVisible();
});

test("tabbing through the header skips the emblem", async ({ page }) => {
  await page.goto("/");
  await expect(cartLink(page)).toBeVisible();

  const reached: string[] = [];

  for (let press = 0; press < 15; press += 1) {
    await page.keyboard.press("Tab");

    if (await isFocused(emblem(page))) reached.push("emblem");
    if (await isFocused(wordmark(page))) reached.push("wordmark");
    if (await isFocused(cartLink(page))) {
      reached.push("cart");
      break;
    }
  }

  expect(reached).toEqual(["wordmark", "cart"]);
});

test("clicking the emblem goes to the home page", async ({ page }) => {
  await page.goto("/cart");

  await emblem(page).click();

  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
});

test("the header stays inside the scroll padding reserved for it", async ({
  page,
}) => {
  await page.goto("/");

  const { height } = await box(header(page));
  const scrollPadding = await page
    .locator("html")
    .evaluate((html) => parseFloat(getComputedStyle(html).scrollPaddingTop));
  const width = page.viewportSize()?.width ?? 0;

  expect(height).toBeLessThanOrEqual(scrollPadding);

  if (width < 640) expect(height).toBeLessThanOrEqual(80);
  else expect(height).toBe(64);
});

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the spread row is the mobile layout");

  test("the emblem and the cart sit at matching edges, the wordmark centred between them", async ({
    page,
  }) => {
    await page.goto("/");

    const bar = await box(header(page));
    const mark = await box(emblem(page));
    const name = await box(wordmark(page));
    const cart = await box(cartLink(page));

    expect(
      Math.abs(mark.x - bar.x - (bar.x + bar.width - (cart.x + cart.width))),
    ).toBeLessThanOrEqual(1);

    const before = name.x - (mark.x + mark.width);
    const after = cart.x - (name.x + name.width);

    expect(before).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(0);
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });

  test("the focused wordmark ends before the cart's bee begins", async ({
    page,
  }) => {
    await page.goto("/");

    await wordmark(page).focus();
    await expect(wordmark(page)).toBeFocused();

    const name = await box(wordmark(page));
    const bee = await box(cartBee(page));
    const ring = await wordmark(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    });

    expect(name.x + name.width + ring).toBeLessThanOrEqual(bee.x);
  });
});
