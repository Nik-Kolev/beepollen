import { expect, type Locator, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

const NOTICE = "Сайтът е в разработка — поръчки все още не се приемат.";

function banner(page: Page) {
  return page.getByRole("complementary", { name: "Състояние на сайта" });
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();

  if (!bounds) throw new Error("The element has no box.");

  return bounds;
}

for (const path of [
  "/",
  "/products/pchelen-prashets-500g",
  "/cart",
  "/checkout",
  "/terms",
  "/no-such-page",
]) {
  test(`the work-in-progress banner sits above the header on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(banner(page)).toHaveText(NOTICE);

    const notice = await box(banner(page));
    const header = await box(page.getByRole("banner"));

    expect(notice.y).toBe(0);
    expect(notice.y + notice.height).toBeLessThanOrEqual(header.y);
  });
}

test("the admin has no work-in-progress banner", async ({ page, context }) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test("the admin bar, the banner and the header stack without overlapping", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/");

  const adminBar = page.getByRole("navigation", { name: "Админ" });

  await expect(adminBar).toBeVisible();

  const bar = await box(adminBar);
  const notice = await box(banner(page));
  const header = await box(page.getByRole("banner"));

  expect(bar.y + bar.height).toBeLessThanOrEqual(notice.y);
  expect(notice.y + notice.height).toBeLessThanOrEqual(header.y);
});

test("the banner scrolls away while the header stays on screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 600));

  await expect.poll(async () => (await box(banner(page))).y).toBeLessThan(0);
  await expect
    .poll(async () => (await box(page.getByRole("banner"))).y)
    .toBe(0);
});
