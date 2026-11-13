import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, test } from "node:test";

import { applyOrderStep } from "@/lib/admin-orders";
import {
  ERASED_NAME,
  erasedEmail,
  eraseCustomer,
} from "@/lib/customer-erasure";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";
import { isSubscribed } from "@/lib/subscriptions";
import { withdrawFromOrder } from "@/lib/withdrawal";

import { distinctBuyer, validCheckoutInput } from "./support/checkout";

beforeEach(() => {
  resetRateLimits();
});

after(async () => {
  await prisma.$disconnect();
});

const ITEM_CHANGE = {
  field: "item",
  from: "Пчелен прашец 500 г × 1",
  to: "Пчелен прашец 500 г × 2",
};

async function editEvent(orderId: number) {
  await prisma.orderEvent.create({
    data: {
      orderId,
      kind: "EDIT",
      adminEmail: "admin@example.com",
      changes: [
        { field: "phone", from: "+359888765431", to: "+359888765432" },
        ITEM_CHANGE,
      ],
    },
  });
}

async function settledCustomer() {
  const email = `erase-${randomUUID()}@example.com`;
  const phone = "0888 765 432";

  const first = await placeOrder(
    validCheckoutInput({ email, phone, acceptsOffers: true }),
    "198.51.100.200",
  );
  const second = await placeOrder(validCheckoutInput({ email, phone }), null);
  assert.ok(first.ok && second.ok);

  const withdrawn = await withdrawFromOrder(
    {
      reference: first.order.reference,
      name: "Иван Иванов-Петров",
      email,
      phone,
    },
    null,
  );
  assert.equal(withdrawn.ok, true);
  assert.deepEqual(
    await applyOrderStep(first.order.reference, "cancel", "new"),
    { ok: true },
  );

  await editEvent(second.order.id);
  assert.deepEqual(
    await applyOrderStep(second.order.reference, "send", "new"),
    { ok: true },
  );
  assert.deepEqual(
    await applyOrderStep(second.order.reference, "pay", "sent"),
    { ok: true },
  );

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { email },
  });

  return {
    email,
    customerId: customer.id,
    orders: [
      { reference: first.order.reference, status: "cancelled" },
      { reference: second.order.reference, status: "paid" },
    ],
  };
}

function ordersOf(customerId: number) {
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { id: "asc" },
    include: {
      items: true,
      consents: true,
      events: { orderBy: { id: "asc" } },
    },
  });
}

test("a dry run names the customer's orders with their status and changes nothing", async () => {
  const { email, customerId, orders } = await settledCustomer();
  const before = await ordersOf(customerId);

  const result = await eraseCustomer(` ${email.toUpperCase()} `, {
    apply: false,
  });

  assert.deepEqual(result, { found: true, applied: false, orders });
  assert.deepEqual(await ordersOf(customerId), before);
  assert.equal(
    (await prisma.customer.findUniqueOrThrow({ where: { id: customerId } }))
      .email,
    email,
  );
});

test("erasing removes every personal field and keeps each sale and its non-personal history", async () => {
  const { email, customerId, orders } = await settledCustomer();
  const before = await ordersOf(customerId);

  const result = await eraseCustomer(email, { apply: true });
  assert.deepEqual(result, { found: true, applied: true, orders });

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });
  assert.deepEqual(
    { name: customer.name, email: customer.email, phone: customer.phone },
    { name: ERASED_NAME, email: erasedEmail(customerId), phone: "" },
  );

  const after = await ordersOf(customerId);
  assert.equal(after.length, before.length);
  for (const [i, order] of after.entries()) {
    assert.equal(order.contactName, ERASED_NAME);
    assert.equal(order.contactPhone, "");
    assert.equal(order.withdrawalName, null);
    for (const consent of order.consents) {
      assert.equal(consent.ipAddress, null);
      if (consent.kind === "OFFERS") assert.notEqual(consent.withdrawnAt, null);
    }

    const kept = before[i];
    assert.equal(order.reference, kept.reference);
    assert.equal(order.totalCents, kept.totalCents);
    assert.equal(order.createdAt.getTime(), kept.createdAt.getTime());
    assert.equal(order.officeCity, kept.officeCity);
    assert.equal(order.withdrawnAt?.getTime(), kept.withdrawnAt?.getTime());
    assert.deepEqual(order.items, kept.items);
    assert.deepEqual(
      order.events.map((event) => event.kind),
      kept.events.map((event) => event.kind),
    );
  }

  const edit = after[1].events.find((event) => event.kind === "EDIT");
  assert.deepEqual(edit?.changes, [ITEM_CHANGE]);

  assert.equal(await isSubscribed(customerId), false);
  assert.deepEqual(await eraseCustomer(email, { apply: true }), {
    found: false,
  });
});

test("a customer with an order still open is not erased, and nothing changes", async () => {
  const email = `erase-${randomUUID()}@example.com`;
  const placed = await placeOrder(validCheckoutInput({ email }), null);
  assert.ok(placed.ok);

  const result = await eraseCustomer(email, { apply: true });

  assert.deepEqual(result, {
    found: true,
    applied: false,
    orders: [{ reference: placed.order.reference, status: "new" }],
  });
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: placed.order.id },
    include: { customer: true },
  });
  assert.equal(order.contactName, "Иван Иванов");
  assert.equal(order.customer.email, email);
});

test("erasing one customer leaves every other customer's data and history alone", async () => {
  const { email } = await settledCustomer();
  const other = distinctBuyer();
  const placed = await placeOrder(
    validCheckoutInput({ ...other, acceptsOffers: true }),
    "198.51.100.201",
  );
  assert.ok(placed.ok);
  await editEvent(placed.order.id);

  await eraseCustomer(email, { apply: true });

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: placed.order.id },
    include: { consents: true, customer: true, events: true },
  });
  assert.equal(order.contactName, "Иван Иванов");
  assert.equal(order.customer.email, other.email);
  assert.ok(order.consents.every((consent) => consent.ipAddress !== null));
  assert.ok(order.consents.every((consent) => consent.withdrawnAt === null));
  assert.deepEqual(
    order.events.find((event) => event.kind === "EDIT")?.changes,
    [
      { field: "phone", from: "+359888765431", to: "+359888765432" },
      ITEM_CHANGE,
    ],
  );
});

test("an erased address can order again as a new customer", async () => {
  const { email, customerId } = await settledCustomer();
  await eraseCustomer(email, { apply: true });

  const again = await placeOrder(validCheckoutInput({ email }), null);
  assert.ok(again.ok);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: again.order.id },
  });
  assert.notEqual(order.customerId, customerId);
  assert.equal(
    (await prisma.customer.findUniqueOrThrow({ where: { id: customerId } }))
      .name,
    ERASED_NAME,
  );
});

test("an unknown or malformed email finds no one and changes nothing", async () => {
  assert.deepEqual(
    await eraseCustomer(`nobody-${randomUUID()}@example.com`, { apply: true }),
    { found: false },
  );
  assert.deepEqual(await eraseCustomer("not an email", { apply: true }), {
    found: false,
  });
});
