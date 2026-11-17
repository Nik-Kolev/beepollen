import { expect, test } from "@playwright/test";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test.skip(
  ({ isMobile }) => !isMobile,
  "Writes promotions to the shared database; one project is enough.",
);

const PRODUCT = "Пчелен прашец 500 г";

function sofiaDay(offset: number) {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shown(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

test("a promotion is added, shown as a card instead of the form, edited and ended", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");

  const article = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: PRODUCT, exact: true }) });
  const panel = article.getByRole("region", { name: "Промоция" });
  const form = panel.getByRole("form", { name: `Промоция за ${PRODUCT}` });
  const status = panel.getByRole("status");
  const starts = sofiaDay(1);
  const ends = sofiaDay(3);

  await expect(form.getByLabel("От")).toHaveAttribute("min", sofiaDay(0));
  await form.getByLabel("Процент (%)").fill("20");
  await form.getByLabel("От").fill(sofiaDay(-1));
  await form.getByLabel("До (включително)").fill(ends);
  await form.getByRole("button", { name: "Добави промоция" }).click();
  await expect(status).toHaveText("Началната дата вече е минала.");
  await expect(form.getByLabel("От")).toHaveAttribute("aria-invalid", "true");

  await form.getByLabel("От").fill(starts);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await form.getByRole("button", { name: "Добави промоция" }).click();
  await expect(status).toHaveText("Запазено.");
  await expect(form.getByRole("button", { name: "Запазено ✓" })).toBeVisible();
  await form.getByLabel("Процент (%)").press("Enter");
  await page.waitForLoadState("networkidle");
  expect(posts).toHaveLength(1);

  const card = panel.getByText("Предстои промоция").locator("..");
  await expect(form).toBeHidden();
  await expect(card).toContainText(`От${shown(starts)}`);
  await expect(card).toContainText(`До${shown(ends)}`);
  await expect(card).toContainText("Отстъпка−20%");
  await expect(card.getByRole("button", { name: "Редактирай" })).toBeFocused();

  await card.getByRole("button", { name: "Редактирай" }).click();
  await expect(form.getByLabel("Процент (%)")).toBeFocused();
  await expect(form.getByLabel("Процент (%)")).toHaveValue("20");
  await expect(form.getByLabel("От")).toHaveValue(starts);
  await form.getByLabel("Процент (%)").fill("25");
  await form.getByRole("button", { name: "Запази промоцията" }).click();
  await expect(status).toHaveText("Запазено.");
  await expect(form).toBeHidden();
  await expect(card).toContainText("Отстъпка−25%");

  const endButton = card.getByRole("button", { name: "Прекрати", exact: true });
  const dialog = page.getByRole("dialog", { name: "Сигурни ли сте?" });
  const postsBeforeEnd = posts.length;
  await endButton.click();
  await expect(dialog).toContainText(
    `Промоцията на ${PRODUCT} от ${shown(starts)} до ${shown(ends)} спира веднага.`,
  );
  await expect(dialog.getByRole("button", { name: "Отказ" })).toBeFocused();
  await dialog.getByRole("button", { name: "Отказ" }).click();
  await expect(dialog).toBeHidden();
  await expect(endButton).toBeFocused();
  await page.waitForLoadState("networkidle");
  expect(posts).toHaveLength(postsBeforeEnd);
  await expect(card).toContainText("Отстъпка−25%");

  await endButton.click();
  await dialog.getByRole("button", { name: "Прекрати промоцията" }).click();
  const ended = panel
    .getByRole("listitem")
    .filter({ hasText: `Прекратена промоция на ${shown(sofiaDay(0))}` });
  await expect(ended).toContainText(`От${shown(starts)}`);
  await expect(ended).toContainText("Отстъпка−25%");
  await expect(
    form.getByRole("button", { name: "Добави промоция" }),
  ).toBeVisible();
  await expect(form.getByLabel("Процент (%)")).toBeFocused();
});
