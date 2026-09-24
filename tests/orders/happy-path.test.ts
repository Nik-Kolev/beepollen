import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { orderReferencePrefix, placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

test("prices and names an order strictly from the database, ignoring anything the caller supplies for them", async () => {
  const input = validCheckoutInput({
    items: [
      {
        slug: "pchelen-prashets-500g",
        quantity: 3,
        priceCents: 1,
        name: "Хакнато име",
      },
    ],
  });

  const result = await placeOrder(input, null);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.order.itemsCents, 3 * 2450);
  assert.equal(result.order.deliveryCents, 0);
  assert.equal(result.order.totalCents, 3 * 2450);
  assert.ok(
    result.order.reference.startsWith(orderReferencePrefix(new Date())),
  );

  const item = await prisma.orderItem.findFirst({
    where: { orderId: result.order.id },
  });

  assert.equal(item?.unitPriceCents, 2450);
  assert.equal(item?.name, "Пчелен прашец 500 г");
  assert.equal(item?.quantity, 3);
});

test("a second submission with the same idempotency key returns the first order instead of creating another", async () => {
  const idempotencyKey = randomUUID();

  const first = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    }),
    null,
  );

  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.repeated, false);

  const second = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: "pchelen-prashets-1kg", quantity: 5 }],
    }),
    null,
  );

  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.repeated, true);
  assert.deepEqual(second.order, first.order);

  const count = await prisma.order.count({ where: { idempotencyKey } });
  assert.equal(count, 1);
});

test("two concurrent submissions of one idempotency key both return the same single order rather than one of them throwing", async () => {
  const idempotencyKey = randomUUID();
  const email = `concurrent-${randomUUID()}@example.com`;

  const [first, second] = await Promise.all([
    placeOrder(
      validCheckoutInput({
        email,
        idempotencyKey,
        items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
      }),
      null,
    ),
    placeOrder(
      validCheckoutInput({
        email,
        idempotencyKey,
        items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
      }),
      null,
    ),
  ]);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.equal(first.order.id, second.order.id);
  assert.equal(first.order.totalCents, 2 * 2450);
  assert.equal(second.order.totalCents, 2 * 2450);
  assert.equal(
    [first.repeated, second.repeated].filter(Boolean).length,
    1,
    "exactly one of the two should be reported as a replay",
  );

  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 1);
});

test("snapshots the contact name and phone onto the order, so a later order under the same email cannot rewrite them", async () => {
  const email = `snapshot-${randomUUID()}@example.com`;

  const first = await placeOrder(
    validCheckoutInput({ email, name: "Първо Име", phone: "0888000001" }),
    null,
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const second = await placeOrder(
    validCheckoutInput({ email, name: "Второ Име", phone: "0888000002" }),
    null,
  );
  assert.equal(second.ok, true);

  const stored = await prisma.order.findUniqueOrThrow({
    where: { id: first.order.id },
    select: { contactName: true, contactPhone: true },
  });

  assert.deepEqual(stored, {
    contactName: "Първо Име",
    contactPhone: "0888000001",
  });
});
