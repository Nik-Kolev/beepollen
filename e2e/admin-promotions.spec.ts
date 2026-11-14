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

test("a promotion is added, refused when it overlaps, edited and ended", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/products");

  const article = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: PRODUCT, exact: true }) });
  const form = article.getByRole("form", { name: `Промоция за ${PRODUCT}` });
  const starts = sofiaDay(1);
  const ends = sofiaDay(3);

  await form.getByLabel("Процент (%)").fill("20");
  await form.getByLabel("От").fill(starts);
  await form.getByLabel("До (включително)").fill(ends);
  await form.getByRole("button", { name: "Добави промоция" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");

  const row = article
    .getByRole("listitem")
    .filter({ hasText: `${shown(starts)} – ${shown(ends)}` });
  await expect(row).toContainText("Предстои");
  await expect(row).toContainText("−20%");

  await form.getByLabel("Процент (%)").fill("10");
  await form.getByLabel("От").fill(sofiaDay(2));
  await form.getByLabel("До (включително)").fill(sofiaDay(4));
  await form.getByRole("button", { name: "Добави промоция" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "В тези дни продуктът вече има промоция.",
  );
  await expect(form.getByLabel("От")).toHaveAttribute("aria-invalid", "true");

  await row.getByRole("button", { name: "Редактирай" }).click();
  await expect(form.getByLabel("Процент (%)")).toHaveValue("20");
  await expect(form.getByLabel("От")).toHaveValue(starts);
  await form.getByLabel("Процент (%)").fill("25");
  await form.getByRole("button", { name: "Запази промоцията" }).click();
  await expect(form.getByRole("status")).toHaveText("Запазено.");
  await expect(row).toContainText("−25%");

  await row.getByRole("button", { name: "Прекрати" }).click();
  await expect(row).toContainText("Прекратена");
  await expect(row.getByRole("button", { name: "Прекрати" })).toHaveCount(0);
});
