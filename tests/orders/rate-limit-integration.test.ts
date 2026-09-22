import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ORDER_RATE_LIMIT, placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";

import { validCheckoutInput } from "../support/checkout";

before(() => {
  resetRateLimits();
});

after(async () => {
  resetRateLimits();
  await prisma.$disconnect();
});

test("allows exactly the configured limit of orders from one IP address before rejecting the next", async () => {
  const ip = "198.51.100.10";

  for (let i = 0; i < ORDER_RATE_LIMIT.limit; i++) {
    const result = await placeOrder(validCheckoutInput(), ip);
    assert.equal(result.ok, true);
  }

  const blocked = await placeOrder(validCheckoutInput(), ip);
  assert.deepEqual(blocked, { ok: false, code: "REJECTED" });
});

test("does not count an order from a different IP address against another address's limit", async () => {
  resetRateLimits();
  const busyIp = "198.51.100.20";
  const otherIp = "198.51.100.21";

  for (let i = 0; i < ORDER_RATE_LIMIT.limit; i++) {
    await placeOrder(validCheckoutInput(), busyIp);
  }
  const blocked = await placeOrder(validCheckoutInput(), busyIp);
  assert.deepEqual(blocked, { ok: false, code: "REJECTED" });

  const stillAllowed = await placeOrder(validCheckoutInput(), otherIp);
  assert.equal(stillAllowed.ok, true);
});

test("never rate limits a submission with no IP address, however many are placed", async () => {
  resetRateLimits();

  for (let i = 0; i <= ORDER_RATE_LIMIT.limit; i++) {
    const result = await placeOrder(validCheckoutInput(), null);
    assert.equal(result.ok, true);
  }
});
