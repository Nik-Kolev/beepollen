import { expect, test } from "@playwright/test";

test("the homepage serves its shell", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Пчелни продукти Д & Н Димитрови");
  await expect(page.locator("html")).toHaveAttribute("lang", "bg");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the catalogue renders published products from the database", async ({
  page,
}) => {
  await page.goto("/");

  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(1);

  await expect(cards.first().getByRole("heading", { level: 3 })).toBeVisible();
  await expect(cards.first().getByRole("img")).toBeVisible();

  // The seed keeps one unpublished row, so the query's filter has a case to fail.
  await expect(
    page.getByRole("heading", { level: 3, name: "Lorem ipsum", exact: true }),
  ).toHaveCount(0);
});

test("an unknown path renders the not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});
