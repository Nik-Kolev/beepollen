import assert from "node:assert/strict";
import { after, test } from "node:test";

import { LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import { listEcontOffices } from "@/lib/delivery-offices";
import { TODO_ECONT_TARIFF_CENTS } from "@/lib/econt";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

async function localOffice() {
  const office = await prisma.deliveryOffice.findFirst({
    where: { carrier: "ECONT", city: LOCAL_DELIVERY_CITY },
    select: { code: true },
  });

  assert.ok(
    office,
    `The snapshot holds no Econt office in ${LOCAL_DELIVERY_CITY}; the tests that refuse one reach nothing`,
  );

  return office;
}

test("an Econt order is charged the tariff, and the total includes it", async () => {
  const result = await placeOrder(validCheckoutInput(), null);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
  });

  assert.equal(order.deliveryMethod, "ECONT_OFFICE");
  assert.equal(order.deliveryCents, TODO_ECONT_TARIFF_CENTS);
  assert.equal(order.totalCents, order.itemsCents + TODO_ECONT_TARIFF_CENTS);
});

test("a local order needs no office, costs nothing to deliver and stores no office", async () => {
  const result = await placeOrder(
    validCheckoutInput({ deliveryMethod: "LOCAL", officeCode: "" }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
  });

  assert.equal(order.deliveryMethod, "LOCAL");
  assert.equal(order.deliveryCents, 0);
  assert.equal(order.totalCents, order.itemsCents);
  assert.equal(order.officeCarrier, null);
  assert.equal(order.officeCode, null);
  assert.equal(order.officeName, null);
  assert.equal(order.officeCity, null);
  assert.equal(order.officeStreet, null);
});

test("a local order ignores an office code sent alongside it", async () => {
  const result = await placeOrder(
    validCheckoutInput({ deliveryMethod: "LOCAL" }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
  });

  assert.equal(order.officeCode, null);
  assert.equal(order.deliveryCents, 0);
});

test("a delivery price or total sent by the caller is ignored", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      deliveryMethod: "ECONT_OFFICE",
      deliveryCents: 0,
      totalCents: 1,
    }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.order.deliveryCents, TODO_ECONT_TARIFF_CENTS);
  assert.equal(
    result.order.totalCents,
    result.order.itemsCents + TODO_ECONT_TARIFF_CENTS,
  );
});

test("an Econt office in the local city is refused, since it cannot be shipped to from there", async () => {
  const office = await localOffice();

  const result = await placeOrder(
    validCheckoutInput({ officeCode: office.code }),
    null,
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, "UNKNOWN_OFFICE");
});

test("the office list leaves out the local city's offices and keeps every other city", async () => {
  await localOffice();

  const offices = await listEcontOffices();
  const total = await prisma.deliveryOffice.count({
    where: { carrier: "ECONT" },
  });
  const local = await prisma.deliveryOffice.count({
    where: { carrier: "ECONT", city: LOCAL_DELIVERY_CITY },
  });

  assert.equal(
    offices.some((office) => office.city === LOCAL_DELIVERY_CITY),
    false,
  );
  assert.equal(offices.length, total - local);
});

test("an unknown delivery method is named as a validation error", async () => {
  const result = await placeOrder(
    validCheckoutInput({ deliveryMethod: "COURIER" }),
    null,
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, "VALIDATION_ERROR");
  if (result.code !== "VALIDATION_ERROR") return;
  assert.deepEqual(result.fields, ["deliveryMethod"]);
});

test("a missing office is reported together with any other invalid field", async () => {
  const result = await placeOrder(
    validCheckoutInput({ name: "", officeCode: "" }),
    null,
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, "VALIDATION_ERROR");
  if (result.code !== "VALIDATION_ERROR") return;
  assert.deepEqual([...result.fields].sort(), ["name", "officeCode"]);
});
