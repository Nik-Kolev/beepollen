import { expect, test } from "@playwright/test";

test("the home page introduces both producers below the products, without a photo of anyone", async ({
  page,
}) => {
  await page.goto("/");

  const about = page.getByRole("region", { name: "За нас" });
  const producers = about.getByRole("listitem");
  await expect(producers).toHaveCount(2);
  await expect(producers.nth(0).getByRole("heading")).toHaveText(/^TODO: /);
  await expect(producers.nth(1).getByRole("heading")).toHaveText(/^TODO: /);
  await expect(about.locator("img")).toHaveCount(0);

  const productsBottom = await page
    .getByRole("main")
    .getByRole("list")
    .first()
    .evaluate((list) => list.getBoundingClientRect().bottom);
  const aboutTop = await about.evaluate(
    (section) => section.getBoundingClientRect().top,
  );
  expect(aboutTop).toBeGreaterThanOrEqual(productsBottom);
});

test("the producers sit side by side on a wide screen and stack on a phone", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  const tops = await page
    .getByRole("region", { name: "За нас" })
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top)),
    );

  if (isMobile) expect(tops[1]).toBeGreaterThan(tops[0]);
  else expect(tops[1]).toBe(tops[0]);
});
