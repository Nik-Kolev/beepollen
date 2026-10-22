import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { signEmailToken } from "@/lib/email-token";

import { TEST_ADMIN_EMAIL, TEST_EMAIL_TOKEN_SECRET } from "./admin-env";
import { signInAs } from "./admin-session";
import { offersConsent, placeOrderWithOffers } from "./e2e-db";

const SECRET = { EMAIL_TOKEN_SECRET: TEST_EMAIL_TOKEN_SECRET };

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
}

function subscribedOrder() {
  const reference = placeOrderWithOffers(
    `subscriber-${randomUUID()}@example.com`,
  );
  return { reference, ...offersConsent(reference) };
}

test("a confirmation link confirms only once its button is pressed", async ({
  page,
  context,
}) => {
  const order = subscribedOrder();
  const token = signEmailToken("confirm", order.id, SECRET);

  await page.goto(`/subscription/confirm?token=${token}`);

  await expect(
    page.getByRole("heading", { name: "Потвърдете абонамента" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expectNoAxeViolations(page);
  expect(offersConsent(order.reference).confirmedAt).toBeNull();

  await page.getByRole("button", { name: "Потвърждавам абонамента" }).click();

  await expect(
    page.getByRole("heading", { name: "Абонаментът е потвърден" }),
  ).toBeVisible();
  await expect(page).toHaveURL("/subscription/confirm?result=confirmed");
  expect(offersConsent(order.reference).confirmedAt).not.toBeNull();
  await expectNoAxeViolations(page);

  await signInAs(context, TEST_ADMIN_EMAIL);
  await page.goto("/admin/orders?filter=new");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: order.reference }) });
  await card.getByText("Детайли").click();
  await expect(card.locator("details")).toContainText("Потвърдено на");
});

test("an unsubscribe link withdraws only once its button is pressed", async ({
  page,
}) => {
  const order = subscribedOrder();
  const token = signEmailToken("unsubscribe", order.customerId, SECRET);

  await page.goto(`/subscription/unsubscribe?token=${token}`);

  await expect(
    page.getByRole("heading", { name: "Отписване от офертите" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  expect(offersConsent(order.reference).withdrawnAt).toBeNull();

  await page.getByRole("button", { name: "Отписване" }).click();

  await expect(
    page.getByRole("heading", { name: "Отписахте се" }),
  ).toBeVisible();
  await expect(page).toHaveURL("/subscription/unsubscribe?result=unsubscribed");
  expect(offersConsent(order.reference).withdrawnAt).not.toBeNull();
  await expectNoAxeViolations(page);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the unsubscribe button still works as a plain form post", async ({
    page,
  }) => {
    const order = subscribedOrder();
    const token = signEmailToken("unsubscribe", order.customerId, SECRET);

    await page.goto(`/subscription/unsubscribe?token=${token}`);
    await page.getByRole("button", { name: "Отписване" }).click();

    await expect(
      page.getByRole("heading", { name: "Отписахте се" }),
    ).toBeVisible();
    expect(offersConsent(order.reference).withdrawnAt).not.toBeNull();
  });
});

for (const path of ["/subscription/confirm", "/subscription/unsubscribe"]) {
  test(`${path} with a tampered token says the link is not valid and offers no button`, async ({
    page,
  }) => {
    const order = subscribedOrder();
    const purpose = path.endsWith("confirm") ? "confirm" : "unsubscribe";
    const id = purpose === "confirm" ? order.id : order.customerId;
    const forged = signEmailToken(purpose, id, {
      EMAIL_TOKEN_SECRET: "x".repeat(32),
    });

    await page.goto(`${path}?token=${forged}`);

    await expect(
      page.getByRole("heading", { name: "Връзката не е валидна" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
}

test("the one-click unsubscribe endpoint withdraws on POST and ignores GET", async ({
  request,
}) => {
  const order = subscribedOrder();
  const token = signEmailToken("unsubscribe", order.customerId, SECRET);

  const get = await request.get(`/api/unsubscribe?token=${token}`);
  expect(get.status()).toBe(405);
  expect(offersConsent(order.reference).withdrawnAt).toBeNull();

  const post = await request.post(`/api/unsubscribe?token=${token}`, {
    form: { "List-Unsubscribe": "One-Click" },
  });
  expect(post.status()).toBe(204);
  expect(offersConsent(order.reference).withdrawnAt).not.toBeNull();
});
