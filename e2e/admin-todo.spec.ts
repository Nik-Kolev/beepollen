import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test("the todo page lists what each product still owes and every group of open items", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/todo");

  const nav = page.getByRole("navigation", { name: "Админ" });
  await expect(nav.getByRole("link", { name: "За попълване" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const products = page.getByRole("region", { name: "Продукти в базата" });
  const pollen = products
    .getByRole("listitem")
    .filter({ hasText: "Пчелен прашец 500 г" });
  await expect(pollen).toContainText("Липсва:");
  await expect(pollen).toContainText("Състав");

  for (const group of [
    "Продавач и правни данни",
    "Измислени числа — изтриват се при старта",
    "Отворени въпроси",
  ]) {
    await expect(
      page.getByRole("region", { name: group }).getByRole("listitem").first(),
    ).toBeVisible();
  }

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
});

test("the admin bar above the shop leads to the todo page", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Админ" })
    .getByRole("link", { name: "За попълване" })
    .click();

  await expect(page).toHaveURL("/admin/todo");
});

test("the admin header's four sections fit a 320px screen without scrolling sideways", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Mobile emulation zooms out to fit wide content, so overflow never shows.",
  );
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/admin/todo");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
