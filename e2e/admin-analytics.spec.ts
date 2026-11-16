import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

const PERIOD_HEADINGS = [
  "Последните 7 дни",
  "Последните 30 дни",
  "Общо",
] as const;

test("the admin reaches the statistics from the order list's navigation", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  await page
    .getByRole("navigation", { name: "Админ" })
    .getByRole("link", { name: "Статистика", exact: true })
    .click();

  await expect(page).toHaveURL("/admin/analytics");
  await expect(
    page.getByRole("heading", { level: 1, name: "Статистика" }),
  ).toBeAttached();
  await expect(
    page
      .getByRole("navigation", { name: "Админ" })
      .getByRole("link", { name: "Статистика", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const heading of PERIOD_HEADINGS) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading, exact: true }),
    ).toBeVisible();
  }
});

test("without Google Analytics connected each period shows its subscribers and no visitor numbers", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/analytics");

  await expect(
    page.getByText(/^Google Analytics още не е свързан с админа/),
  ).toBeVisible();

  for (const heading of PERIOD_HEADINGS) {
    const card = page.getByRole("region", { name: heading, exact: true });
    await expect(card.getByText("Посетители", { exact: true })).toBeVisible();
    await expect(
      card.getByText("Посетители", { exact: true }).locator("xpath=.."),
    ).toContainText("—");
    await expect(card.getByText("Абонати", { exact: true })).toBeVisible();
    await expect(card.getByText("Няма данни.", { exact: true })).toBeVisible();
    await expect(card.getByRole("list")).toHaveCount(0);
  }
});
