import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  deliveryLabel,
  formatOrderTime,
  getOrderByReference,
  listOrders,
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
