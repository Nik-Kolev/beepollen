import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { CONSENT_WORDING } from "@/lib/consent";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

test("collapses duplicate slugs in one submission into a single line with the summed quantity", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      items: [
        { slug: "pchelen-prashets-500g", quantity: 2 },
        { slug: "pchelen-prashets-500g", quantity: 3 },
      ],
    }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const lines = await prisma.orderItem.findMany({
    where: { orderId: result.order.id },
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.quantity, 5);
  assert.equal(result.order.itemsCents, 5 * 2450);
});

test("caps a collapsed duplicate quantity at MAX_LINE_QUANTITY rather than summing past it", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      items: [
        { slug: "pchelen-prashets-500g", quantity: 60 },
        { slug: "pchelen-prashets-500g", quantity: 60 },
      ],
    }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const lines = await prisma.orderItem.findMany({
    where: { orderId: result.order.id },
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.quantity, MAX_LINE_QUANTITY);
  assert.equal(result.order.itemsCents, MAX_LINE_QUANTITY * 2450);
});

test("always writes a TERMS consent with the exact wording and the caller's IP address", async () => {
  const ipAddress = "203.0.113.5";
  const result = await placeOrder(
    validCheckoutInput({ acceptsOffers: false }),
    ipAddress,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const consents = await prisma.consent.findMany({
    where: { orderId: result.order.id },
  });

  assert.equal(consents.length, 1);
  assert.equal(consents[0]?.kind, "TERMS");
  assert.equal(consents[0]?.wording, CONSENT_WORDING.TERMS);
  assert.equal(consents[0]?.ipAddress, ipAddress);
});

test("writes an OFFERS consent only when acceptsOffers is true", async () => {
  const result = await placeOrder(
    validCheckoutInput({ acceptsOffers: true }),
    "203.0.113.6",
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const consents = await prisma.consent.findMany({
    where: { orderId: result.order.id },
    orderBy: { kind: "asc" },
  });

  assert.deepEqual(
    consents.map((consent) => consent.kind),
    ["OFFERS", "TERMS"],
  );

  const offers = consents.find((consent) => consent.kind === "OFFERS");
  assert.equal(offers?.wording, CONSENT_WORDING.OFFERS);
});

test("stores a null consent IP address when no IP is passed to placeOrder", async () => {
  const result = await placeOrder(validCheckoutInput(), null);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const consent = await prisma.consent.findFirst({
    where: { orderId: result.order.id, kind: "TERMS" },
  });

  assert.equal(consent?.ipAddress, null);
});

test("upserts the customer by email so two orders from one address produce one customer row with the latest name and phone", async () => {
  const email = `customer-${randomUUID()}@example.com`;

  const first = await placeOrder(
    validCheckoutInput({ email, name: "Първо Име", phone: "0888000001" }),
    null,
  );
  const second = await placeOrder(
    validCheckoutInput({ email, name: "Второ Име", phone: "0888000002" }),
    null,
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  const customers = await prisma.customer.findMany({ where: { email } });
  assert.equal(customers.length, 1);
  assert.equal(customers[0]?.name, "Второ Име");
  assert.equal(customers[0]?.phone, "+359888000002");

  const orders = await prisma.order.findMany({
    where: { id: { in: [first.order.id, second.order.id] } },
    select: { customerId: true },
  });
  assert.equal(orders[0]?.customerId, orders[1]?.customerId);
});
