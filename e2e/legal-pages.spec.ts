import { expect, type Page, test } from "@playwright/test";

function legalLink(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Правна информация" })
    .getByRole("link", { name, exact: true });
}

test("the footer's legal links open the privacy and cookie pages", async ({
  page,
}) => {
  await page.goto("/");

  await legalLink(page, "Поверителност").click();
  await expect(page).toHaveURL("/privacy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Политика за поверителност" }),
  ).toBeVisible();

  await legalLink(page, "Бисквитки").click();
  await expect(page).toHaveURL("/cookies");
  await expect(
    page.getByRole("heading", { level: 1, name: "Политика за бисквитките" }),
  ).toBeVisible();
});

test("the privacy and cookie pages link to each other", async ({ page }) => {
  await page.goto("/privacy");
  await page
    .getByRole("main")
    .getByRole("link", { name: "политиката за бисквитките", exact: true })
    .click();
  await expect(page).toHaveURL("/cookies");

  await page
    .getByRole("main")
    .getByRole("link", { name: "политиката за поверителност", exact: true })
    .click();
  await expect(page).toHaveURL("/privacy");
});
