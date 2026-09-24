import assert from "node:assert/strict";
import { after, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { TEST_OFFICE_CODE, validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

test("the seeded snapshot still carries the office every other test orders to", async () => {
  const office = await prisma.deliveryOffice.findUnique({
    where: { carrier_code: { carrier: "ECONT", code: TEST_OFFICE_CODE } },
  });

  assert.ok(
    office,
    `Office ${TEST_OFFICE_CODE} is gone from prisma/data/econt-offices.json; pick another in tests/support/checkout.ts`,
  );
});

test("snapshots the chosen office onto the order rather than pointing at its row", async () => {
  const office = await prisma.deliveryOffice.findUniqueOrThrow({
    where: { carrier_code: { carrier: "ECONT", code: TEST_OFFICE_CODE } },
  });

  const result = await placeOrder(validCheckoutInput(), null);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
  });

  assert.equal(order.officeCarrier, "ECONT");
  assert.equal(order.officeCode, office.code);
  assert.equal(order.officeName, office.name);
  assert.equal(order.officeCity, office.city);
  assert.equal(order.officeStreet, office.street);
});

test("refuses a code that is not in the office table", async () => {
  const result = await placeOrder(
    validCheckoutInput({ officeCode: "no-such-office" }),
    null,
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, "UNKNOWN_OFFICE");
});

test("names officeCode when no office was chosen", async () => {
  const result = await placeOrder(validCheckoutInput({ officeCode: "" }), null);

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, "VALIDATION_ERROR");
  assert.deepEqual(result.fields, ["officeCode"]);
});

test("keeps the address after the office leaves the table", async () => {
  const office = await prisma.deliveryOffice.create({
    data: {
      carrier: "ECONT",
      code: "test-doomed-office",
      name: "Тестов офис",
      city: "Тестово",
      postCode: "0000",
      street: "ул. Тестова 1",
      hours: "09:00 – 18:00",
      phone: null,
      latitude: null,
      longitude: null,
    },
  });

  const result = await placeOrder(
    validCheckoutInput({ officeCode: office.code }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  await prisma.deliveryOffice.delete({ where: { id: office.id } });

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
  });

  assert.equal(order.officeCode, "test-doomed-office");
  assert.equal(order.officeName, "Тестов офис");
  assert.equal(order.officeCity, "Тестово");
  assert.equal(order.officeStreet, "ул. Тестова 1");
});
