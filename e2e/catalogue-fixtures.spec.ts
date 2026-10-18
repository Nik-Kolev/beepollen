import { expect, test } from "@playwright/test";

import { deleteTestProduct, publishTestProduct } from "./e2e-db";

const SINGLE_IMAGE_SLUG = "test-edna-snimka";
const NO_IMAGE_SLUG = "test-bez-snimka";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  publishTestProduct(SINGLE_IMAGE_SLUG, [
    { path: "/products/pollen-plate.jpg", alt: "Пчелен прашец в чиния" },
  ]);
  publishTestProduct(NO_IMAGE_SLUG, []);
});

test.afterAll(() => {
  deleteTestProduct(SINGLE_IMAGE_SLUG);
  deleteTestProduct(NO_IMAGE_SLUG);
});

test("a single-image product renders no thumbnail strip", async ({ page }) => {
  await page.goto(`/products/${SINGLE_IMAGE_SLUG}`);

  const main = page.getByRole("main");
  await expect(main.getByRole("img")).toHaveCount(1);
  await expect(main.getByRole("img")).toHaveAttribute(
    "alt",
    "Пчелен прашец в чиния",
  );
});

test("a product with no photo and no food information shows only what it has", async ({
  page,
}) => {
  const response = await page.goto(`/products/${NO_IMAGE_SLUG}`);
  expect(response?.status()).toBe(200);

  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", {
      level: 1,
      name: `Тестов продукт ${NO_IMAGE_SLUG}`,
    }),
  ).toBeVisible();
  await expect(main.getByRole("img")).toHaveCount(0);
  await expect(main.locator("dt")).toHaveText(["Описание"]);

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "",
  );
  expect(jsonLd.image).toEqual([]);
  expect(jsonLd.weight).toBeUndefined();
});
