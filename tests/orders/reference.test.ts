import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import {
  nextOrderReference,
  orderReferencePrefix,
  placeOrder,
} from "@/lib/orders";
import prisma from "@/lib/prisma";

import { TEST_OFFICE_SNAPSHOT, validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

function sequenceOf(reference: string, prefix: string) {
  return Number(reference.slice(prefix.length));
}

async function placeOne() {
  const result = await placeOrder(
    validCheckoutInput({
      idempotencyKey: randomUUID(),
      items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("the order was refused");

  return result.order;
}

test("the prefix is BP plus the day and month, read in Sofia rather than UTC", () => {
  // 01:30 in Sofia, still the previous day in UTC.
  assert.equal(
    orderReferencePrefix(new Date("2026-09-24T22:30:00Z")),
    "BP2509",
  );
  assert.equal(
    orderReferencePrefix(new Date("2026-09-24T09:00:00Z")),
    "BP2409",
  );
});

test("the first order of a day is number 1 and every later one takes the next", () => {
  assert.equal(nextOrderReference("BP2409", null), "BP24091");
  assert.equal(nextOrderReference("BP2409", "BP24091"), "BP24092");
  assert.equal(nextOrderReference("BP2409", "BP24099"), "BP240910");
});

test("a stored reference that cannot be read as a number restarts the day at 1", () => {
  assert.equal(nextOrderReference("BP2409", "BP2409"), "BP24091");
  assert.equal(nextOrderReference("BP2409", "BP2409x"), "BP24091");
});

test("two orders placed one after the other take consecutive numbers", async () => {
  const prefix = orderReferencePrefix(new Date());

  const first = await placeOne();
  const second = await placeOne();

  assert.ok(first.reference.startsWith(prefix));
  assert.ok(second.reference.startsWith(prefix));
  assert.equal(
    sequenceOf(second.reference, prefix),
    sequenceOf(first.reference, prefix) + 1,
  );
});

test("an order from another day does not carry its number into today", async () => {
  const customer = await prisma.customer.create({
    data: {
      name: "Стара поръчка",
      email: `past-${randomUUID()}@example.com`,
      phone: "0888000000",
    },
    select: { id: true },
  });

  await prisma.order.create({
    data: {
      customerId: customer.id,
      contactName: "Стара поръчка",
      contactPhone: "0888000000",
      ...TEST_OFFICE_SNAPSHOT,
      // Day 00 of month 00: a prefix no calendar date can produce, so the run
      // date cannot turn this row into one of today's.
      reference: "BP000099",
      itemsCents: 1,
      deliveryCents: 0,
      totalCents: 1,
      idempotencyKey: randomUUID(),
    },
  });

  const prefix = orderReferencePrefix(new Date());
  const placed = await placeOne();

  assert.ok(placed.reference.startsWith(prefix));
  assert.ok(sequenceOf(placed.reference, prefix) < 99);
});

test("concurrent orders never share a reference", async () => {
  const placed = await Promise.all([placeOne(), placeOne(), placeOne()]);
  const references = placed.map((order) => order.reference);

  assert.equal(
    new Set(references).size,
    references.length,
    references.join(" "),
  );
});

test("a replayed idempotency key returns the reference the first order was given", async () => {
  const idempotencyKey = randomUUID();
  const input = validCheckoutInput({
    idempotencyKey,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
  });

  const first = await placeOrder(input, null);
  const second = await placeOrder(input, null);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.equal(second.order.reference, first.order.reference);
  assert.equal(second.repeated, true);
});

// Last in the file: it leaves the day's numbering blocked until its own cleanup
// restores it, and every test after it would be refused too.
test("an order is refused rather than thrown when every attempt loses its number", async () => {
  const prefix = orderReferencePrefix(new Date());
  const newest = await prisma.order.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { reference: true },
  });
  const contested = nextOrderReference(prefix, newest?.reference ?? null);
  const sequence = Number(contested.slice(prefix.length));

  const customer = await prisma.customer.create({
    data: {
      name: "Блокирана номерация",
      email: `contested-${randomUUID()}@example.com`,
      phone: "0888000000",
    },
    select: { id: true },
  });

  const fixture = (reference: string) => ({
    customerId: customer.id,
    contactName: "Блокирана номерация",
    contactPhone: "0888000000",
    ...TEST_OFFICE_SNAPSHOT,
    reference,
    itemsCents: 1,
    deliveryCents: 0,
    totalCents: 1,
    idempotencyKey: randomUUID(),
  });

  // The higher number is written first, so the newest row holds the lower one:
  // every attempt reads that one, adds one, and lands on a number already taken.
  const blocker = await prisma.order.create({
    data: fixture(`${prefix}${sequence + 1}`),
    select: { id: true },
  });
  const decoy = await prisma.order.create({
    data: fixture(contested),
    select: { id: true },
  });

  try {
    const result = await placeOrder(
      validCheckoutInput({
        idempotencyKey: randomUUID(),
        items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
      }),
      null,
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "REJECTED");
  } finally {
    await prisma.order.deleteMany({
      where: { id: { in: [blocker.id, decoy.id] } },
    });
  }
});
