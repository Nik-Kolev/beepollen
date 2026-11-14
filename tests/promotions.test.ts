import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { getPublishedProductBySlug } from "@/lib/products";
import { promoPriceCents, sofiaToday, withPromotion } from "@/lib/promotions";

import { validCheckoutInput } from "./support/checkout";

const created: number[] = [];

after(async () => {
  await prisma.product.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

function shiftDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function productWithPromotion(
  promotion: {
    kind: "PERCENT" | "PRICE";
    value: number;
    startsOn: string;
    endsOn: string;
    endedAt?: Date;
  } | null,
) {
  const slug = `promo-${randomUUID()}`;
  const product = await prisma.product.create({
    data: {
      slug,
      name: "Промо продукт",
      summary: "test",
      description: "test",
      priceCents: 1000,
      isPublished: true,
      promotions: promotion
        ? { create: { ...promotion, createdBy: "admin@example.com" } }
        : undefined,
    },
  });
  created.push(product.id);
  return slug;
}

test("sofiaToday is the calendar day in Sofia, not in UTC", () => {
  assert.equal(sofiaToday(new Date("2026-11-14T22:30:00Z")), "2026-11-15");
  assert.equal(sofiaToday(new Date("2026-07-01T20:59:00Z")), "2026-07-01");
  assert.equal(sofiaToday(new Date("2026-07-01T21:00:00Z")), "2026-07-02");
});

test("a percentage promotion rounds to whole cents", () => {
  assert.equal(promoPriceCents(1000, { kind: "PERCENT", value: 30 }), 700);
  assert.equal(promoPriceCents(995, { kind: "PERCENT", value: 15 }), 846);
});

test("a fixed promotion price is used as given", () => {
  assert.equal(promoPriceCents(1000, { kind: "PRICE", value: 650 }), 650);
});

test("a promotion that does not lower the price, or would make it free, is ignored", () => {
  assert.equal(promoPriceCents(1000, { kind: "PRICE", value: 1000 }), null);
  assert.equal(promoPriceCents(1000, { kind: "PRICE", value: 1200 }), null);
  assert.equal(promoPriceCents(1000, { kind: "PRICE", value: 0 }), null);
  assert.equal(promoPriceCents(1000, { kind: "PERCENT", value: 100 }), null);
  assert.equal(promoPriceCents(1000, { kind: "PERCENT", value: 0 }), null);
  assert.equal(promoPriceCents(0, { kind: "PERCENT", value: 30 }), null);
});

test("withPromotion keeps the regular price beside the promo price", () => {
  const product = withPromotion({
    slug: "x",
    priceCents: 1000,
    promotions: [{ kind: "PERCENT", value: 30 }],
  });
  assert.deepEqual(product, {
    slug: "x",
    priceCents: 700,
    regularPriceCents: 1000,
  });
});

test("withPromotion without a promotion leaves the price and no regular price", () => {
  const product = withPromotion({
    slug: "x",
    priceCents: 1000,
    promotions: [],
  });
  assert.deepEqual(product, {
    slug: "x",
    priceCents: 1000,
    regularPriceCents: null,
  });
});

test("an order is charged the promotion price on its first and last day", async () => {
  const today = sofiaToday();

  for (const range of [
    { startsOn: today, endsOn: shiftDay(today, 3) },
    { startsOn: shiftDay(today, -3), endsOn: today },
  ]) {
    const slug = await productWithPromotion({
      kind: "PERCENT",
      value: 30,
      ...range,
    });
    const result = await placeOrder(
      validCheckoutInput({ items: [{ slug, quantity: 2 }] }),
      null,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const item = await prisma.orderItem.findFirst({
      where: { orderId: result.order.id },
    });
    assert.equal(item?.unitPriceCents, 700);
    assert.equal(result.order.itemsCents, 1400);
  }
});

test("an order is charged the regular price outside the promotion's dates or once it is ended", async () => {
  const today = sofiaToday();

  for (const promotion of [
    {
      kind: "PRICE" as const,
      value: 500,
      startsOn: shiftDay(today, 1),
      endsOn: shiftDay(today, 5),
    },
    {
      kind: "PRICE" as const,
      value: 500,
      startsOn: shiftDay(today, -5),
      endsOn: shiftDay(today, -1),
    },
    {
      kind: "PRICE" as const,
      value: 500,
      startsOn: shiftDay(today, -1),
      endsOn: shiftDay(today, 1),
      endedAt: new Date(),
    },
  ]) {
    const slug = await productWithPromotion(promotion);
    const result = await placeOrder(
      validCheckoutInput({ items: [{ slug, quantity: 1 }] }),
      null,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.order.itemsCents, 1000);
  }
});

test("the product page reads the promotion price with the regular one beside it", async () => {
  const today = sofiaToday();
  const slug = await productWithPromotion({
    kind: "PRICE",
    value: 650,
    startsOn: today,
    endsOn: today,
  });

  const product = await getPublishedProductBySlug(slug);
  assert.equal(product?.priceCents, 650);
  assert.equal(product?.regularPriceCents, 1000);
});
