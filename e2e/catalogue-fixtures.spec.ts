import { expect, type Page, test } from "@playwright/test";

import { ORGANIC } from "@/lib/organic";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { deleteTestProduct, publishTestProduct } from "./e2e-db";

const SINGLE_IMAGE_SLUG = "test-edna-snimka";
const NO_IMAGE_SLUG = "test-bez-snimka";

function imageNames(page: Page) {
  return page
    .getByRole("main")
    .getByRole("img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("alt")));
}

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

  await expect
    .poll(() => imageNames(page))
    .toEqual(["Пчелен прашец в чиния", ORGANIC.logoAlt]);
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
  await expect.poll(() => imageNames(page)).toEqual([ORGANIC.logoAlt]);
  await expect(main.locator("dt")).toHaveText(["Описание"]);

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "",
  );
  expect(jsonLd.image).toEqual([]);
  expect(jsonLd.weight).toBeUndefined();
});

test("the owner's todo page lists only the products that still owe a field, with a box for each owed field", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/todo");

  const products = page.getByRole("region", { name: "Продукти в базата" });
  await expect(products.getByRole("heading", { level: 3 })).toHaveText([
    `Тестов продукт ${SINGLE_IMAGE_SLUG}`,
    `Тестов продукт ${NO_IMAGE_SLUG}`,
  ]);

  const fixture = products
    .getByRole("listitem")
    .filter({ hasText: `Тестов продукт ${NO_IMAGE_SLUG}` });
  await expect(fixture.getByRole("textbox")).toHaveCount(8);
  for (const label of [
    "Кратко описание",
    "Описание",
    "Нетно количество",
    "Състав",
    "Произход",
    "Условия на съхранение",
    "Срок на годност",
    "Алергени",
  ]) {
    await expect(
      fixture.getByRole("textbox", { name: label, exact: true }),
    ).toBeVisible();
  }
});
