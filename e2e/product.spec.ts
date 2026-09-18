import { expect, type Page, test } from "@playwright/test";

import { productPhotoTransitionName } from "@/lib/view-transition";

const PUBLISHED_SLUG = "pchelen-prashets-500g";
const PUBLISHED_NAME = "Пчелен прашец 500 г";

async function recordViewTransitions(page: Page) {
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document);

    document.startViewTransition = (update) => {
      const transition = start(update);

      void transition.ready.then(() => {
        document.body.dataset.transitioned = document
          .getAnimations()
          .map(({ effect }) =>
            effect instanceof KeyframeEffect
              ? `${effect.pseudoElement}=${effect.getTiming().duration}`
              : null,
          )
          .join(" ");
      });

      return transition;
    };
  });

  return () => page.locator("body").getAttribute("data-transitioned");
}

test("a catalogue card opens its product page", async ({ page }) => {
  await page.goto("/");

  const card = page.getByRole("main").getByRole("listitem").first();
  const name = await card.getByRole("heading", { level: 3 }).innerText();

  await card.getByRole("link").click();

  await expect(page).toHaveURL(/\/products\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("the whole card is clickable, not just the name", async ({ page }) => {
  await page.goto("/");

  const card = page.getByRole("main").getByRole("listitem").first();
  const href = await card.getByRole("link").getAttribute("href");

  // Over the image, well clear of the link text — this fails if the stretched
  // overlay is gone, which clicking the link itself would not catch.
  await card.click({ position: { x: 20, y: 20 } });

  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test("the product page serves its data", async ({ page }) => {
  const response = await page.goto(`/products/${PUBLISHED_SLUG}`);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(
    "Пчелен прашец 500 г | Пчелни продукти Д & Н Димитрови",
  );

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Пчелен прашец 500 г",
  );
  await expect(
    page.getByRole("button", { name: "Добави в количката" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("term").filter({ hasText: "Нетно количество" }),
  ).toBeVisible();
  await expect(page.getByText("500 г", { exact: true })).toBeVisible();
});

test("the gallery swaps the main image", async ({ page }) => {
  await page.goto(`/products/${PUBLISHED_SLUG}`);

  const mainImage = page.getByRole("main").getByRole("img").first();
  const bagThumbnail = page.getByRole("button", {
    name: "Пакет пчелен прашец 500 г",
  });
  const plateThumbnail = page.getByRole("button", {
    name: "Пчелен прашец в чиния",
  });

  await expect(mainImage).toHaveAttribute("alt", "Пакет пчелен прашец 500 г");
  await expect(bagThumbnail).toHaveAttribute("aria-pressed", "true");

  await plateThumbnail.click();

  await expect(mainImage).toHaveAttribute("alt", "Пчелен прашец в чиния");
  await expect(plateThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(bagThumbnail).toHaveAttribute("aria-pressed", "false");
});

test("a single-image product renders no thumbnail strip", async ({ page }) => {
  await page.goto("/products/pchelna-pita-400g");

  await expect(page.getByRole("main").getByRole("img")).toHaveCount(1);
});

test("the product page carries valid Product structured data", async ({
  page,
}) => {
  await page.goto(`/products/${PUBLISHED_SLUG}`);

  const raw = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const jsonLd = JSON.parse(raw ?? "");

  expect(jsonLd["@type"]).toBe("Product");
  expect(jsonLd.name).toBe("Пчелен прашец 500 г");
  expect(jsonLd.image).toHaveLength(2);
  expect(jsonLd.weight).toMatchObject({ value: 500, unitCode: "GRM" });
  // No price is real yet, so a structured Offer would publish a false one.
  expect(jsonLd.offers).toBeUndefined();
});

test("a card's photo morphs into the product page's photo", async ({
  page,
}) => {
  await page.goto("/");
  const transitioned = await recordViewTransitions(page);

  await page
    .getByRole("main")
    .getByRole("link", { name: PUBLISHED_NAME })
    .click();

  const name = productPhotoTransitionName(PUBLISHED_SLUG);
  await expect.poll(transitioned).toContain(`::view-transition-old(${name})`);
  await expect.poll(transitioned).toContain(`::view-transition-new(${name})`);
});

test("the morph does not animate for visitors who reduce motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const transitioned = await recordViewTransitions(page);

  await page
    .getByRole("main")
    .getByRole("link", { name: PUBLISHED_NAME })
    .click();

  const name = productPhotoTransitionName(PUBLISHED_SLUG);
  await expect
    .poll(transitioned)
    .toContain(`::view-transition-group(${name})=0`);
});

test("a product opened directly links back to the catalogue", async ({
  page,
}) => {
  await page.goto(`/products/${PUBLISHED_SLUG}`);
  await page.getByRole("link", { name: "Към продуктите" }).click();

  await expect(page).toHaveURL("/");
});

test("the back link returns to where the catalogue was left", async ({
  page,
}) => {
  await page.goto("/");

  const card = page.getByRole("main").getByRole("listitem").last();
  await card.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);

  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/products\//);
  await page.getByRole("link", { name: "Към продуктите" }).click();

  await expect(page).toHaveURL("/");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test("a modified click on the back link opens the catalogue in a new tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: PUBLISHED_NAME })
    .click();
  await expect(page).toHaveURL(/\/products\//);

  const newTab = context.waitForEvent("page");
  await page
    .getByRole("link", { name: "Към продуктите" })
    .click({ modifiers: ["ControlOrMeta"] });

  await expect(await newTab).toHaveURL("/");
  await expect(page).toHaveURL(/\/products\//);
});

test("an unpublished product is not reachable", async ({ page }) => {
  const response = await page.goto("/products/lorem-ipsum");

  expect(response?.status()).toBe(404);
});

test("an unknown slug renders the not-found page", async ({ page }) => {
  const response = await page.goto("/products/no-such-product");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
});
