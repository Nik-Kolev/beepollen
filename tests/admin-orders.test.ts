import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  countOrdersByFilter,
  deliveryLabel,
  formatOrderTime,
  getOrderByReference,
  listOrders,
  ORDER_FILTERS,
  orderMarkInput,
  parseOrderFilter,
  setOrderMark,
} from "@/lib/admin-orders";
import { CONSENT_WORDING } from "@/lib/consent";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { TEST_OFFICE_SNAPSHOT, validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

async function place(
  overrides: Record<string, unknown> = {},
  ipAddress: string | null = null,
) {
  const result = await placeOrder(validCheckoutInput(overrides), ipAddress);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("order was refused");
  return result.order;
}

test("lists orders newest first", async () => {
  const older = await place();
  const newer = await place();

  const references = (await listOrders()).map((order) => order.reference);

  assert.ok(
    references.indexOf(newer.reference) < references.indexOf(older.reference),
  );
  assert.equal(references[0], newer.reference);
});

test("reads one order by its reference with its lines, snapshot contact, email, office and consents", async () => {
  const placed = await place(
    {
      name: "Мария Петрова",
      phone: "0888111222",
      email: "Maria@Example.com",
      acceptsOffers: true,
      items: [
        { slug: "pchelen-prashets-500g", quantity: 2 },
        { slug: "pchelen-prashets-1kg", quantity: 1 },
      ],
    },
    "203.0.113.7",
  );
  await place();

  const order = await getOrderByReference(placed.reference);

  assert.ok(order);
  assert.equal(order.contactName, "Мария Петрова");
  assert.equal(order.contactPhone, "+359888111222");
  assert.equal(order.customer.email, "maria@example.com");
  assert.equal(order.officeCode, TEST_OFFICE_SNAPSHOT.officeCode);
  assert.equal(order.officeCity, TEST_OFFICE_SNAPSHOT.officeCity);
  assert.equal(order.totalCents, placed.totalCents);
  assert.deepEqual(
    order.items.map(({ name, quantity }) => ({ name, quantity })),
    [
      { name: "Пчелен прашец 500 г", quantity: 2 },
      { name: "Пчелен прашец 1 кг", quantity: 1 },
    ],
  );
  assert.deepEqual(
    order.consents.map(({ kind, wording, ipAddress }) => ({
      kind,
      wording,
      ipAddress,
    })),
    [
      {
        kind: "OFFERS",
        wording: CONSENT_WORDING.OFFERS,
        ipAddress: "203.0.113.7",
      },
      {
        kind: "TERMS",
        wording: CONSENT_WORDING.TERMS,
        ipAddress: "203.0.113.7",
      },
    ],
  );
});

test("an unknown reference reads as no order", async () => {
  assert.equal(await getOrderByReference("BP000000"), null);
});

test("labels a Popovo order as hand delivery and an Econt order by its office city", async () => {
  const local = await place({ deliveryMethod: "LOCAL", officeCode: "" });
  const econt = await place();

  const listed = await listOrders();
  const find = (reference: string) =>
    listed.find((order) => order.reference === reference);
  const localListed = find(local.reference);
  const econtListed = find(econt.reference);

  assert.ok(localListed && econtListed);
  assert.equal(deliveryLabel(localListed), "Попово — на ръка");
  assert.equal(deliveryLabel(econtListed), TEST_OFFICE_SNAPSHOT.officeCity);
});

test("a new order carries no marks", async () => {
  const placed = await place();

  const order = await getOrderByReference(placed.reference);

  assert.ok(order);
  assert.equal(order.sentAt, null);
  assert.equal(order.paidAt, null);
  assert.equal(order.cancelledAt, null);
});

test("marking an order stamps only that mark, and unmarking clears it", async () => {
  const placed = await place();

  await setOrderMark(placed.reference, "sent", true);
  const fresh = await prisma.order.findUniqueOrThrow({
    where: { reference: placed.reference },
  });

  assert.ok(fresh.sentAt instanceof Date);
  assert.equal(fresh.paidAt, null);
  assert.equal(fresh.cancelledAt, null);

  await setOrderMark(placed.reference, "sent", false);
  const cleared = await prisma.order.findUniqueOrThrow({
    where: { reference: placed.reference },
  });

  assert.equal(cleared.sentAt, null);
});

test("marking an already marked order keeps the time it was first marked", async () => {
  const placed = await place();

  await setOrderMark(placed.reference, "paid", true);
  const first = await prisma.order.findUniqueOrThrow({
    where: { reference: placed.reference },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  await setOrderMark(placed.reference, "paid", true);
  const second = await prisma.order.findUniqueOrThrow({
    where: { reference: placed.reference },
  });

  assert.ok(first.paidAt);
  assert.equal(second.paidAt?.getTime(), first.paidAt.getTime());
});

test("marking an unknown reference changes nothing and does not throw", async () => {
  await setOrderMark("BP000000", "sent", true);

  assert.equal(await getOrderByReference("BP000000"), null);
});

test("filters list what is still to send, still to collect, and what was cancelled", async () => {
  const fresh = await place();
  const sent = await place();
  const paid = await place();
  const cancelled = await place();
  await setOrderMark(sent.reference, "sent", true);
  await setOrderMark(paid.reference, "sent", true);
  await setOrderMark(paid.reference, "paid", true);
  await setOrderMark(cancelled.reference, "cancelled", true);

  const listed = async (filter: (typeof ORDER_FILTERS)[number]) =>
    new Set((await listOrders(filter)).map((order) => order.reference));
  const unsent = await listed("unsent");
  const unpaid = await listed("unpaid");
  const cancelledOnly = await listed("cancelled");
  const all = await listed("all");

  assert.ok(unsent.has(fresh.reference));
  assert.ok(!unsent.has(sent.reference));
  assert.ok(!unsent.has(cancelled.reference));

  assert.ok(unpaid.has(fresh.reference));
  assert.ok(unpaid.has(sent.reference));
  assert.ok(!unpaid.has(paid.reference));
  assert.ok(!unpaid.has(cancelled.reference));

  assert.ok(cancelledOnly.has(cancelled.reference));
  assert.ok(!cancelledOnly.has(fresh.reference));

  for (const order of [fresh, sent, paid, cancelled]) {
    assert.ok(all.has(order.reference));
  }
});

test("each filter's count matches the orders it lists", async () => {
  const counts = await countOrdersByFilter();

  for (const filter of ORDER_FILTERS) {
    assert.equal(counts[filter], (await listOrders(filter)).length, filter);
  }
});

test("a mark request is accepted only with a known mark, a strict boolean and a bounded reference", () => {
  const valid = { reference: "BP28091", mark: "paid", on: true };

  assert.equal(orderMarkInput.safeParse(valid).success, true);
  for (const crafted of [
    { ...valid, mark: "shipped" },
    { ...valid, mark: "sentAt" },
    { ...valid, on: "true" },
    { ...valid, on: 1 },
    { ...valid, reference: "" },
    { ...valid, reference: "B".repeat(33) },
    { ...valid, reference: { not: null } },
    { mark: "paid", on: true },
    null,
  ]) {
    assert.equal(
      orderMarkInput.safeParse(crafted).success,
      false,
      JSON.stringify(crafted),
    );
  }
});

test("an unknown or missing filter falls back to all orders", () => {
  assert.equal(parseOrderFilter("unsent"), "unsent");
  assert.equal(parseOrderFilter("shipped"), "all");
  assert.equal(parseOrderFilter(undefined), "all");
  assert.equal(parseOrderFilter(["unsent"]), "all");
});

test("shows an order's time in Sofia, across both sides of daylight saving", () => {
  assert.equal(
    formatOrderTime(new Date("2026-09-26T22:30:00Z")),
    "27.09.2026 г., 01:30",
  );
  assert.equal(
    formatOrderTime(new Date("2026-01-15T09:05:00Z")),
    "15.01.2026 г., 11:05",
  );
});
