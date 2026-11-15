import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { deleteCampaigns, placeOrderWithOffers } from "./e2e-db";

test.skip(
  ({ isMobile }) => !isMobile,
  "Writes campaigns to the shared database; one project is enough.",
);

test("an anonymous visitor to the campaign page is sent to the login page", async ({
  page,
}) => {
  await page.goto("/admin/campaigns");

  await expect(page).toHaveURL("/admin/login?next=%2Fadmin%2Fcampaigns");
});

test("a restock campaign is previewed, confirmed and sent, and a second one is warned about", async ({
  page,
  context,
}) => {
  deleteCampaigns();
  placeOrderWithOffers(`campaign-${Date.now()}@example.com`);
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/campaigns");

  const form = page.getByRole("form", { name: "Нова кампания" });
  await form.getByRole("radio", { name: "Ново зареждане" }).check();
  const text = form.getByLabel("Текст");
  await expect(text).toHaveValue(/^Имаме ново зареждане/);

  await text.fill("");
  await form.getByRole("button", { name: "Изпрати" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "Напишете текста на имейла.",
  );
  await expect(text).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("dialog")).toBeHidden();

  await text.fill("Пресен прашец от тази седмица.");
  await form.getByRole("checkbox", { name: "Пчелен прашец 1 кг" }).check();
  await form.getByRole("button", { name: "Преглед" }).click();
  await expect(
    form.getByText("Тема: Ново зареждане: Пчелен прашец 1 кг"),
  ).toBeVisible();
  const preview = page.frameLocator('iframe[title="Преглед на имейла"]');
  await expect(
    preview.getByText("Пресен прашец от тази седмица."),
  ).toBeVisible();

  const dialog = page.getByRole("dialog", { name: "Да изпратим ли?" });
  await form.getByRole("button", { name: "Изпрати" }).click();
  await expect(dialog).toContainText("Ново зареждане до");
  await expect(dialog.getByRole("button", { name: "Отказ" })).toBeFocused();
  await dialog.getByRole("button", { name: "Отказ" }).click();
  await expect(dialog).toBeHidden();

  await form.getByRole("button", { name: "Изпрати" }).click();
  await dialog.getByRole("button", { name: "Изпрати" }).click();
  await expect(form.getByRole("status")).toHaveText(
    /^Изпраща се до \d+ абонати\./,
  );

  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  const warning = page.getByRole("dialog", { name: "Скоро е пращано" });
  await form.getByRole("button", { name: "Изпрати" }).click();
  await expect(warning).toContainText(
    "изпратихте „Ново зареждане: Пчелен прашец 1 кг“",
  );
  await expect(warning.getByRole("button", { name: "Не" })).toBeFocused();
  await warning.getByRole("button", { name: "Не" }).click();
  await expect(warning).toBeHidden();
  await page.waitForLoadState("networkidle");
  expect(posts).toEqual([]);
});
