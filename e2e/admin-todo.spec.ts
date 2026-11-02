import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

function answerForm(scope: Page | Locator, label: string) {
  const page = "page" in scope ? scope.page() : scope;
  return scope.locator("form").filter({
    has: page.getByRole("textbox", { name: label, exact: true }),
  });
}

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
  await expect(
    pollen.getByRole("textbox", { name: "Цена (€)", exact: true }),
  ).toBeVisible();
  await expect(
    pollen.getByRole("textbox", { name: "Състав", exact: true }),
  ).toBeVisible();

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
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
});

test("the todo page shows one empty email frame with a field for suggestions", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/todo");

  const emails = page.getByRole("region", { name: "Имейли" });
  await expect(emails.locator("iframe")).toHaveCount(1);
  await expect(
    page
      .frameLocator('iframe[title="Примерен имейл"]')
      .getByRole("heading", { name: "Примерен имейл" }),
  ).toBeVisible();
  await expect(
    emails.getByRole("textbox", { name: "Предложения за имейлите" }),
  ).toBeVisible();
});

test("an answer saved on the todo page is there after a reload and in the download", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "Both projects write the same row.");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/todo");

  const answer = `Пчелен прашец ООД, гр. Попово ${Date.now()}`;
  const form = answerForm(
    page,
    "Име и правен статус, адрес по регистрация и за кореспонденция.",
  );
  await form.getByRole("textbox").fill(answer);
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");

  const price = answerForm(
    page.getByRole("region", { name: "Продукти в базата" }),
    "Цена (€)",
  ).first();
  await price.getByRole("textbox").fill("24,50");
  await price.getByRole("button", { name: "Запази" }).click();
  await expect(price.getByRole("status")).toHaveText("Запазено.");

  await page.reload();
  await expect(form.getByRole("textbox")).toHaveValue(answer);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Изтегли отговорите" }).click();
  const file = await (await download).path();
  const rows = JSON.parse(readFileSync(file, "utf8")) as {
    key: string;
    question: string;
    text: string;
    updatedBy: string;
  }[];

  expect(rows).toContainEqual(
    expect.objectContaining({
      key: "seller-name-address",
      question:
        "Име и правен статус, адрес по регистрация и за кореспонденция.",
      text: answer,
      updatedBy: TEST_ADMIN_EMAIL,
    }),
  );
  expect(rows).toContainEqual(
    expect.objectContaining({
      question: expect.stringMatching(/: Цена \(€\)$/),
      text: "24,50",
    }),
  );
});

test("text typed while a save is in flight is never reported as saved", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "Both projects write the same row.");
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/todo");

  const form = answerForm(page, "Хостинг доставчикът и регионът на сървъра.");
  const field = form.getByRole("textbox");
  await field.fill("DigitalOcean");
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Запази" }).click();
  await field.pressSequentially(", Франкфурт");
  await saved;
  await page.waitForTimeout(2000);

  expect(await form.getByRole("status").textContent()).toBe("");
});

test("the answers download is refused to anyone not signed in as an admin", async ({
  request,
}) => {
  const response = await request.get("/admin/todo/answers");

  expect(response.status()).toBe(404);
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
