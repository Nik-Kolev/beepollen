import { expect, test } from "@playwright/test";

test("a production build leaves the about section off the home page", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("main").getByRole("list").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "За нас" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "За нас" })).toHaveCount(0);
});
