import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { nutritionRows, WEB_NUTRITION_PER_100G } from "@/lib/nutrition";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

function answerForm(scope: Page | Locator, label: string) {
  const page = "page" in scope ? scope.page() : scope;
  return scope.locator("form").filter({
    has: page.getByRole("textbox", { name: label, exact: true }),
  });
}

test("the todo page asks the owner's open questions and nothing the seed already answers", async ({
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

  await expect(
    page.getByRole("region", { name: "Продукти в базата" }),
  ).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Цена (€)" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Сорт" })).toHaveCount(0);

  for (const group of [
    "Продавач и правни данни",
    "Хранителна стойност",
    "Отворени въпроси",
  ]) {
    await expect(
      page.getByRole("region", { name: group }).getByRole("listitem").first(),
    ).toBeVisible();
  }
  const table = page
    .getByRole("region", { name: "Хранителна стойност" })
    .getByRole("table", { name: "Хранителна стойност на 100 г" });
  const rows = nutritionRows(WEB_NUTRITION_PER_100G) ?? [];
  expect(rows.length).toBeGreaterThan(0);
  await expect(table.getByRole("rowheader")).toHaveText(
    rows.map(({ label }) => label),
  );
  await expect(table.getByRole("cell")).toHaveText(
    rows.map(({ value }) => value),
  );

  await expect(
    page.getByRole("region", { name: /Попълват се при старта/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/Дата на публикуване/)).toHaveCount(0);
  await expect(page.getByText(/Хостинг доставчикът/)).toHaveCount(0);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
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
    "Регистриран ли сте по ЗДДС? Ако да — номерът.",
  );
  await form.getByRole("textbox").fill(answer);
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");

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
      key: "seller-vat",
      question: "Регистриран ли сте по ЗДДС? Ако да — номерът.",
      text: answer,
      updatedBy: TEST_ADMIN_EMAIL,
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

  const form = answerForm(
    page,
    "Трябва ли регистрация в БАБХ за продажбата на прашеца? Ако трябва и я имате — номерът и за какво е.",
  );
  const field = form.getByRole("textbox");
  await field.fill("Не");
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Запази" }).click();
  await field.pressSequentially(", не трябва");
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
