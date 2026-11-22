import assert from "node:assert/strict";
import { after, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { distinctBuyer, validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

async function chargedTotal() {
  const probe = await placeOrder(
    validCheckoutInput({ shownTotalCents: 1 }),
    null,
  );
  assert.equal(probe.ok, false);
  if (probe.ok || probe.code !== "TOTAL_CHANGED") {
    throw new Error(`expected TOTAL_CHANGED, got ${JSON.stringify(probe)}`);
  }
  return probe.totalCents;
}

test("a total the buyer was not shown is refused before anything is written, naming both totals", async () => {
  const input = validCheckoutInput({ shownTotalCents: 100 });
  const result = await placeOrder(input, null);

  assert.equal(result.ok, false);
  if (result.ok || result.code !== "TOTAL_CHANGED") {
    throw new Error(`expected TOTAL_CHANGED, got ${JSON.stringify(result)}`);
  }
  assert.equal(result.shownTotalCents, 100);
  assert.equal(result.totalCents, await chargedTotal());
  assert.equal(
    await prisma.order.count({
      where: { idempotencyKey: String(input.idempotencyKey) },
    }),
    0,
  );
});

test("the total the buyer was shown is accepted, and the order is charged exactly that", async () => {
  const total = await chargedTotal();
  const result = await placeOrder(
    validCheckoutInput({ shownTotalCents: total }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.order.totalCents, total);
});

test("a refused total spends none of the per-contact order caps", async () => {
  const buyer = distinctBuyer();
  const ip = "203.0.113.77";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const refused = await placeOrder(
      validCheckoutInput({ ...buyer, shownTotalCents: 1 }),
      ip,
    );
    assert.equal(refused.ok, false);
    assert.equal(!refused.ok && refused.code, "TOTAL_CHANGED");
  }

  for (let order = 0; order < 3; order += 1) {
    const placed = await placeOrder(validCheckoutInput({ ...buyer }), ip);
    assert.equal(placed.ok, true, `order ${order + 1} of the day's three`);
  }
});
