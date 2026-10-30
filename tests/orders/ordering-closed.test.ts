import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";

import { ORDER_RATE_LIMIT, placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";

import { validCheckoutInput } from "../support/checkout";

before(() => {
  resetRateLimits();
});

afterEach(() => {
  process.env.ORDERING_OPEN = "true";
});

after(async () => {
  resetRateLimits();
  await prisma.$disconnect();
});

test("a closed shop refuses an order and writes nothing", async () => {
  process.env.ORDERING_OPEN = "false";
  const before = {
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    consents: await prisma.consent.count(),
  };

  const result = await placeOrder(validCheckoutInput(), null);

  assert.deepEqual(result, { ok: false, code: "ORDERING_CLOSED" });
  assert.deepEqual(
    {
      orders: await prisma.order.count(),
      customers: await prisma.customer.count(),
      consents: await prisma.consent.count(),
    },
    before,
  );
});

test("anything but the exact string true keeps the shop closed", async () => {
  for (const value of ["", "TRUE", "1", "yes"]) {
    process.env.ORDERING_OPEN = value;

    assert.deepEqual(await placeOrder(validCheckoutInput(), null), {
      ok: false,
      code: "ORDERING_CLOSED",
    });
  }

  delete process.env.ORDERING_OPEN;

  assert.deepEqual(await placeOrder(validCheckoutInput(), null), {
    ok: false,
    code: "ORDERING_CLOSED",
  });
});

test("a closed shop refuses before validating the order", async () => {
  process.env.ORDERING_OPEN = "false";

  assert.deepEqual(await placeOrder({ name: 5 }, null), {
    ok: false,
    code: "ORDERING_CLOSED",
  });
});

test("a refusal by a closed shop spends no rate-limit attempt", async () => {
  resetRateLimits();
  const ip = "198.51.100.90";
  process.env.ORDERING_OPEN = "false";

  for (let i = 0; i <= ORDER_RATE_LIMIT.limit; i++) {
    await placeOrder(validCheckoutInput(), ip);
  }

  process.env.ORDERING_OPEN = "true";

  const placed = await placeOrder(validCheckoutInput(), ip);

  assert.equal(placed.ok, true);
});
