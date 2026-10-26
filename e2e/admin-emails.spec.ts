import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test("the email preview shows every email in both designs to an admin", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/emails");

  await expect(
    page.getByRole("heading", { level: 1, name: "Имейли — два варианта" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(20);

  const accepted = page.frameLocator(
    'iframe[title="Приета поръчка — до купувача, дизайн A"]',
  );
  await expect(
    accepted.getByRole("heading", { name: "Благодарим за поръчката!" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      accepted
        .locator("img")
        .first()
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);

  const { violations } = await new AxeBuilder({ page })
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
});

test("the email preview is not open to visitors", async ({ page }) => {
  await page.goto("/admin/emails");

  await expect(page).toHaveURL(/\/admin\/login/);
});
