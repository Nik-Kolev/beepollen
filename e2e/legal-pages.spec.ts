import { expect, type Page, test } from "@playwright/test";

import {
  LEGAL_GUARANTEE_NOTICE,
  LEGAL_GUARANTEE_RIGHTS,
  YOUR_EUROPE_GUARANTEES,
} from "@/lib/legal-guarantee";
import {
  CONFORMITY,
  REFUND_TERMS,
  RETURN_TERMS,
  SEALED_PACKAGES,
  WITHDRAWAL_RIGHT,
} from "@/lib/withdrawal-terms";

import { seedCart } from "./seed-cart";

function legalLink(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Правна информация" })
    .getByRole("link", { name, exact: true });
}

test("the footer's legal links open the terms, privacy and cookie pages", async ({
  page,
}) => {
  await page.goto("/");

  await legalLink(page, "Общи условия").click();
  await expect(page).toHaveURL("/terms");
  await expect(
    page.getByRole("heading", { level: 1, name: "Общи условия" }),
  ).toBeVisible();

  await legalLink(page, "Поверителност").click();
  await expect(page).toHaveURL("/privacy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Политика за поверителност" }),
  ).toBeVisible();

  await legalLink(page, "Бисквитки").click();
  await expect(page).toHaveURL("/cookies");
  await expect(
    page.getByRole("heading", { level: 1, name: "Политика за бисквитките" }),
  ).toBeVisible();
});

test("the footer leads to the EU's legal guarantee notice, shown whole with its link", async ({
  page,
}) => {
  await page.goto("/");

  await legalLink(page, "Законова гаранция").click();
  await expect(page).toHaveURL("/legal-guarantee");
  await expect(
    page.getByRole("heading", { level: 1, name: "Законова гаранция" }),
  ).toBeVisible();

  const main = page.getByRole("main");
  const notice = main.getByRole("img", {
    name: /^Известие на Европейския съюз/,
  });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute("src", LEGAL_GUARANTEE_NOTICE);
  await expect
    .poll(() =>
      notice.evaluate((image: HTMLImageElement) =>
        image.complete ? image.naturalWidth : -1,
      ),
    )
    .toBeGreaterThan(0);
  await expect(main).toContainText(CONFORMITY);
  await expect(
    main.getByRole("link", { name: YOUR_EUROPE_GUARANTEES.display }),
  ).toHaveAttribute("href", YOUR_EUROPE_GUARANTEES.href);
  await expect(
    main.getByRole("link", { name: "Отворете известието в пълен размер" }),
  ).toHaveAttribute("href", LEGAL_GUARANTEE_NOTICE);
});

test("the terms and the checkout link to the legal guarantee notice", async ({
  page,
}) => {
  await page.goto("/terms");
  await page
    .getByRole("region", { name: "Рекламации" })
    .getByRole("link", { name: "„Законова гаранция“" })
    .click();
  await expect(page).toHaveURL("/legal-guarantee");

  await seedCart(page, {
    version: 2,
    items: [
      {
        slug: "pchelen-prashets-500g",
        name: "Пчелен прашец 500 г",
        quantity: 1,
      },
    ],
  });
  await page.goto("/checkout");
  const rights = page.getByRole("link", { name: LEGAL_GUARANTEE_RIGHTS });
  await expect(rights).toHaveAttribute("href", "/legal-guarantee");
  await expect(rights).toHaveAttribute("target", "_blank");
  await expect(rights).toHaveAccessibleDescription("Отваря се в нов раздел.");
});

test("the terms carry the withdrawal wording the order email repeats", async ({
  page,
}) => {
  await page.goto("/terms");

  const withdrawal = page.getByRole("region", { name: "Право на отказ" });
  for (const sentence of [
    WITHDRAWAL_RIGHT,
    SEALED_PACKAGES,
    RETURN_TERMS,
    REFUND_TERMS,
  ]) {
    await expect(withdrawal).toContainText(sentence);
  }
  await expect(page.getByRole("region", { name: "Рекламации" })).toContainText(
    CONFORMITY,
  );
});

test("the terms link to the privacy and cookie pages", async ({ page }) => {
  const main = page.getByRole("main");

  await page.goto("/terms");
  await main
    .getByRole("link", { name: "политиката за поверителност", exact: true })
    .click();
  await expect(page).toHaveURL("/privacy");

  await page.goto("/terms");
  await main
    .getByRole("link", { name: "политиката за бисквитките", exact: true })
    .click();
  await expect(page).toHaveURL("/cookies");
});

test("the privacy and cookie pages link to each other", async ({ page }) => {
  await page.goto("/privacy");
  await page
    .getByRole("main")
    .getByRole("link", { name: "политиката за бисквитките", exact: true })
    .click();
  await expect(page).toHaveURL("/cookies");

  await page
    .getByRole("main")
    .getByRole("link", { name: "политиката за поверителност", exact: true })
    .click();
  await expect(page).toHaveURL("/privacy");
});
