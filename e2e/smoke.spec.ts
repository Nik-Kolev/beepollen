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

test("the footer shows the visitor's year rather than the one the page was built in", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2031-06-15T12:00:00"));

  await page.goto("/");

  await expect(page.getByRole("contentinfo")).toContainText(
    "© 2031 Пчелни продукти",
  );
  expect(errors).toEqual([]);
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

  await expect(
    page.getByRole("heading", { level: 3, name: "Lorem ipsum", exact: true }),
  ).toHaveCount(0);
});

const NOT_FOUND_PATHS = [
  ["an unknown path", "/no-such-page"],
  ["an unknown path under /admin", "/admin/no-such-page"],
  ["an unknown product slug", "/products/no-such-product"],
] as const;

for (const [name, path] of NOT_FOUND_PATHS) {
  test(`${name} renders the not-found page inside the shop frame, once`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Страницата не е намерена" }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  });
}
