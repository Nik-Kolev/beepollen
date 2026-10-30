import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

const PERIOD_HEADINGS = [
  "Последните 7 дни",
  "Последните 30 дни",
  "Общо",
] as const;

function sourceCount(row: string) {
  const match = /\(([^)]+)\)\s*$/.exec(row);
  if (!match) throw new Error(`no count at the end of "${row}"`);
  return Number(match[1].replace(/\D/g, ""));
}

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

test("each period shows visitors, subscribers and its sources from most to fewest", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/analytics");

  for (const heading of PERIOD_HEADINGS) {
    const card = page.getByRole("region", { name: heading, exact: true });
    await expect(card.getByText("Посетители", { exact: true })).toBeVisible();
    await expect(card.getByText("Абонати", { exact: true })).toBeVisible();

    const rows = card.getByRole("list").getByRole("listitem");
    await expect(rows).toHaveCount(6);
    const counts = (await rows.allTextContents()).map(sourceCount);

    expect(counts, heading).toEqual([...counts].sort((a, b) => b - a));
  }
});
