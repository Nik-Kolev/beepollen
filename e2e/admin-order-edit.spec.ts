import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { editEvents, placeEcontOrder, renameOrderContact } from "./e2e-db";

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
}

async function openEdit(page: Page, reference: string) {
  await page.goto("/admin/orders?filter=new");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: reference }) });
  await card.getByRole("button", { name: "Редакция" }).click();
  const form = card.getByRole("form", { name: `Редакция на ${reference}` });
  await expect(form.getByLabel("Име", { exact: true })).toBeFocused();
  await expect(form.getByText("Избран офис")).toBeVisible();
  return { card, form };
}

test.beforeEach(async ({ context }) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
});

test("a corrected phone is confirmed from → to, saved, and listed in the history without an email when the box is unticked", async ({
  page,
}) => {
  const reference = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  const { card, form } = await openEdit(page, reference);
  await expectNoAxeViolations(page);

  await form.getByLabel("Телефон", { exact: true }).fill("0899 111 222");
  await form.getByRole("button", { name: "Запази" }).click();

  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await expect(dialog.getByRole("button", { name: "Отказ" })).toBeFocused();
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Телефон+359888123456 → +359899111222",
  ]);
  await expectNoAxeViolations(page);
  const email = dialog.getByRole("checkbox", {
    name: "Изпрати обновен имейл на купувача",
  });
  await expect(email).toBeChecked();
  await email.uncheck();
  await dialog.getByRole("button", { name: "Да, запази" }).click();

  await expect(card.getByRole("button", { name: "Редакция" })).toBeFocused();
  await card.getByText("Детайли").click();
  await expect(
    card.getByRole("link", { name: "+359899111222", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByText("Телефон: +359888123456 → +359899111222"),
  ).toBeVisible();

  const second = await openEdit(page, reference);
  await second.form
    .getByLabel("Име", { exact: true })
    .fill("Отказ Тестов-Петров");
  await second.form.getByRole("button", { name: "Запази" }).click();
  await dialog.getByRole("button", { name: "Да, запази" }).click();

  await expect
    .poll(() => editEvents(reference))
    .toEqual([{ emailStatus: null }, { emailStatus: "SKIPPED" }]);
});

test("a refused value is announced, focused and described by its error", async ({
  page,
}) => {
  const reference = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  const { form } = await openEdit(page, reference);
  const phone = form.getByLabel("Телефон", { exact: true });

  await phone.fill("12345");
  await form.getByRole("button", { name: "Запази" }).click();

  await expect(form.getByRole("status")).toHaveText(
    "Поправете отбелязаните полета.",
  );
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAccessibleDescription(
    "Въведете български телефонен номер, например 0888 123 456.",
  );
  await expectNoAxeViolations(page);

  await phone.fill("0899111222");
  await expect(phone).not.toHaveAttribute("aria-invalid");
});

test("an order changed on another screen is refused as stale, and Обнови brings its current values", async ({
  page,
}) => {
  const reference = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  const other = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  const { card, form } = await openEdit(page, reference);
  renameOrderContact(reference, "Мария Иванова");
  const otherCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: other }) });
  await otherCard.getByRole("button", { name: "Откажи" }).click();
  await page
    .getByRole("dialog", { name: "Сигурни ли сте?" })
    .getByRole("button", { name: "Да, откажи" })
    .click();
  await expect(otherCard).toHaveCount(0);
  await expect(card.getByText("Мария Иванова").first()).toBeVisible();

  await form.getByLabel("Телефон", { exact: true }).fill("0899111222");
  await form.getByRole("button", { name: "Запази" }).click();

  await expect(form.getByRole("status")).toHaveText(
    "Поръчката вече е променена от друг екран.",
  );
  await form.getByRole("button", { name: "Обнови" }).click();
  await expect(card.getByRole("button", { name: "Редакция" })).toBeFocused();
  await expect(card.getByText("Мария Иванова").first()).toBeVisible();
  expect(editEvents(reference)).toEqual([]);
});

test("switching to Попово shows the new delivery price and total, and unticking it again restores the order's office", async ({
  page,
}) => {
  const reference = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  const { card, form } = await openEdit(page, reference);
  const popovo = form.getByRole("checkbox", {
    name: "Доставка на ръка в гр. Попово",
  });

  await popovo.check();
  await popovo.uncheck();
  await expect(form.getByText("Избран офис")).toBeVisible();
  await form.getByRole("button", { name: "Запази" }).click();
  await expect(form.getByText("Няма промени за запазване.")).toBeVisible();

  await popovo.check();
  await form.getByRole("button", { name: "Запази" }).click();
  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await expect(dialog.getByText("Цена на доставката")).toBeVisible();
  await expect(dialog.getByText("Общо")).toBeVisible();
  await expect(dialog.getByText(/→ Попово — на ръка/)).toBeVisible();
  await dialog.getByRole("button", { name: "Да, запази" }).click();

  await expect(card.getByText(/Попово — на ръка/).first()).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Предадена и платена" }),
  ).toBeVisible();
});

test("a sent order offers no edit", async ({ page }) => {
  const reference = placeEcontOrder(
    `edit-${randomUUID()}@example.com`,
    "0888123456",
  );
  await page.goto("/admin/orders?filter=new");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: reference }) });
  await card.getByRole("button", { name: "Изпратена" }).click();
  await page
    .getByRole("dialog", { name: "Сигурни ли сте?" })
    .getByRole("button", { name: "Да, изпратена е" })
    .click();
  await expect(card).toHaveCount(0);

  await page.goto("/admin/orders?filter=sent");
  const sent = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: reference }) });
  await expect(sent.getByRole("button", { name: "Платена" })).toBeVisible();
  await expect(sent.getByRole("button", { name: "Редакция" })).toHaveCount(0);
});
