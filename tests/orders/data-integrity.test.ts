import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

test("an order item survives its product being deleted, keeping its snapshot with a null productId", async () => {
  const slug = `throwaway-${randomUUID()}`;
  const product = await prisma.product.create({
    data: {
      slug,
      name: "Хвърлящ се продукт",
      summary: "test",
      description: "test",
      priceCents: 3300,
      isPublished: true,
    },
  });

  const result = await placeOrder(
    validCheckoutInput({ items: [{ slug, quantity: 2 }] }),
    null,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  await prisma.product.delete({ where: { id: product.id } });

  const item = await prisma.orderItem.findFirst({
    where: { orderId: result.order.id },
  });

  assert.equal(item?.productId, null);
  assert.equal(item?.slug, slug);
  assert.equal(item?.name, "Хвърлящ се продукт");
  assert.equal(item?.unitPriceCents, 3300);
  assert.equal(item?.quantity, 2);
});

test("deleting an order cascades its items and consents down to zero rows", async () => {
  const result = await placeOrder(
    validCheckoutInput({ acceptsOffers: true }),
    "192.0.2.50",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const orderId = result.order.id;

  assert.equal(await prisma.orderItem.count({ where: { orderId } }), 1);
  assert.equal(await prisma.consent.count({ where: { orderId } }), 2);

  await prisma.order.delete({ where: { id: orderId } });

  assert.equal(await prisma.orderItem.count({ where: { orderId } }), 0);
  assert.equal(await prisma.consent.count({ where: { orderId } }), 0);
  assert.equal(await prisma.order.findUnique({ where: { id: orderId } }), null);
});
