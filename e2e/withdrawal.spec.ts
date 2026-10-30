import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";
import { placeEcontOrder, placeLocalOrder } from "./e2e-db";

const SUBMIT = "Потвърждавам отказа";

async function fillWithdrawal(
  page: Page,
  fields: { reference: string; name: string; phone: string; email: string },
) {
  await page.getByLabel("Номер на поръчката").fill(fields.reference);
  await page.getByLabel("Име и фамилия").fill(fields.name);
  await page.getByLabel("Телефон", { exact: true }).fill(fields.phone);
  await page.getByLabel("Имейл", { exact: true }).fill(fields.email);
}

test("the footer's withdrawal link opens the withdrawal form", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Правна информация" })
    .getByRole("link", { name: "Откажете се от договора тук", exact: true })
    .click();

  await expect(page).toHaveURL("/withdraw");
  await expect(
    page.getByRole("heading", { level: 1, name: "Отказ от договора" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: SUBMIT })).toBeEnabled();
});

test("the terms link the withdrawal function to the form", async ({ page }) => {
  await page.goto("/terms");
  await page
    .getByRole("main")
    .getByRole("link", { name: "„Откажете се от договора тук“", exact: true })
    .click();

  await expect(page).toHaveURL("/withdraw");
});

test("an empty submission marks every field and editing one clears its error", async ({
  page,
}) => {
  await page.goto("/withdraw");
  await page.getByRole("button", { name: SUBMIT }).click();

  const reference = page.getByLabel("Номер на поръчката");
  await expect(reference).toHaveAttribute("aria-invalid", "true");
  await expect(reference).toBeFocused();
  for (const label of ["Име и фамилия", "Телефон", "Имейл"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  }

  await reference.fill("BP1");
  await expect(reference).not.toHaveAttribute("aria-invalid");
  await expect(page.getByLabel("Имейл", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("a withdrawal is refused for a mismatched email, then confirmed, repeated with its first time, and flagged in the admin", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Withdrawals are rate limited per address, so they run in the mobile project only.",
  );

  const email = `withdraw-${randomUUID()}@example.com`;
  const reference = placeLocalOrder(email, "0899111222");
  const fields = {
    reference: reference.toLowerCase(),
    name: "Отказ Тестов",
    phone: "0899 111 222",
    email,
  };

  await page.goto("/withdraw");
  await fillWithdrawal(page, { ...fields, email: "someone-else@example.com" });
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    /Не намерихме поръчка с тези данни/,
  );
  await expect(page.getByLabel("Номер на поръчката")).toBeFocused();

  await page.getByLabel("Имейл", { exact: true }).fill(email);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.getByRole("button", { name: SUBMIT }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });

  await expect.poll(() => posts.length).toBeGreaterThan(0);
  await page.waitForLoadState("networkidle");
  expect(posts).toHaveLength(1);
  const received = page.getByRole("heading", { name: "Отказът е получен" });
  await expect(received).toBeFocused();
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  const time = page.getByRole("main").locator("time");
  const firstTime = await time.getAttribute("datetime");
  expect(firstTime).not.toBeNull();

  await page.goto("/withdraw");
  await fillWithdrawal(page, fields);
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(
    page.getByRole("heading", { name: "Отказът вече е заявен" }),
  ).toBeVisible();
  await expect(time).toHaveAttribute("datetime", firstTime!);

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders?shown=9999");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: reference, exact: true }),
  });
  await expect(card.getByText(/^Заявен отказ · /)).toBeVisible();
  await expect(
    card.getByText(/^Заявен отказ · /).locator(`time[datetime="${firstTime}"]`),
  ).toBeVisible();

  await card.getByText("Детайли").click();
  await expect(
    card
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "История" }) })
      .getByRole("listitem")
      .filter({ hasText: "Заявен отказ от купувача" }),
  ).toContainText("имейл не е пратен — изпращането не е настроено");
});

test("a withdrawal that lands while the admin is open stops the hand-over until the owner confirms it", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Withdrawals are rate limited per address, so they run in the mobile project only.",
  );

  const email = `withdraw-${randomUUID()}@example.com`;
  const reference = placeLocalOrder(email, "0899333444");

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders?shown=9999");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: reference, exact: true }),
  });
  const handOver = card.getByRole("button", { name: "Предадена и платена" });
  await expect(handOver).toBeVisible();

  const buyer = await context.newPage();
  await buyer.goto("/withdraw");
  await fillWithdrawal(buyer, {
    reference,
    name: "Отказ Тестов",
    phone: "0899333444",
    email,
  });
  await buyer.getByRole("button", { name: SUBMIT }).click();
  await expect(
    buyer.getByRole("heading", { name: "Отказът е получен" }),
  ).toBeVisible();
  await expect(
    buyer.getByText("Поръчката няма да бъде изпратена."),
  ).toBeVisible();
  await buyer.close();

  await handOver.click();
  await expect(card.getByRole("status")).toHaveText(
    "Купувачът току-що заяви отказ. Обновете, преди да изпратите.",
  );
  await card.getByRole("button", { name: "Обнови" }).click();
  await expect(
    card.getByRole("group", { name: "Стъпки на поръчката" }),
  ).toBeFocused();
  await expect(card.getByText(/^Заявен отказ · /)).toBeVisible();

  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await handOver.click();
  await expect(dialog).toContainText(`Купувачът заяви отказ от ${reference}`);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await dialog.getByRole("button", { name: "Отказ" }).click();
  await expect(dialog).toBeHidden();
  expect(posts).toHaveLength(0);
  await expect(card.getByText("Нова", { exact: true })).toBeVisible();

  await handOver.click();
  await dialog.getByRole("button", { name: "Да, предадена е" }).click();
  await expect(card.getByText("Платена", { exact: true })).toBeVisible();
});

test("a withdrawal that lands while the send dialog is open stops the parcel", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Withdrawals are rate limited per address, so they run in the mobile project only.",
  );

  const email = `withdraw-${randomUUID()}@example.com`;
  const reference = placeEcontOrder(email, "0899333555");

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders?shown=9999");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: reference, exact: true }),
  });
  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  await card.getByRole("button", { name: "Изпратена" }).click();
  await expect(dialog).toContainText("ще се отбележи като изпратена");

  const buyer = await context.newPage();
  await buyer.goto("/withdraw");
  await fillWithdrawal(buyer, {
    reference,
    name: "Отказ Тестов",
    phone: "0899333555",
    email,
  });
  await buyer.getByRole("button", { name: SUBMIT }).click();
  await expect(
    buyer.getByRole("heading", { name: "Отказът е получен" }),
  ).toBeVisible();
  await buyer.close();

  await dialog.getByRole("button", { name: "Да, изпратена е" }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Купувачът току-що заяви отказ. Обновете, преди да изпратите.",
  );
  await expect(card.getByText("Нова", { exact: true })).toBeVisible();
});
