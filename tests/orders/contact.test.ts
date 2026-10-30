import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "../support/checkout";

after(async () => {
  await prisma.$disconnect();
});

async function storedContact(phone: string) {
  const result = await placeOrder(validCheckoutInput({ phone }), null);

  assert.equal(result.ok, true, `${phone} was refused`);
  if (!result.ok) throw new Error("unreachable");

  return prisma.order.findUniqueOrThrow({
    where: { id: result.order.id },
    select: { contactPhone: true, customer: { select: { phone: true } } },
  });
}

test("an email is trimmed and lowercased, so two spellings of one address are one customer", async () => {
  const local = `mixed-${randomUUID()}`;

  const first = await placeOrder(
    validCheckoutInput({ email: `  ${local.toUpperCase()}@Example.COM ` }),
    null,
  );
  const second = await placeOrder(
    validCheckoutInput({ email: `${local}@example.com` }),
    null,
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const customers = await prisma.customer.findMany({
    where: { email: { contains: local } },
    select: { email: true },
  });

  assert.deepEqual(customers, [{ email: `${local}@example.com` }]);
});

for (const [typed, stored] of [
  ["0888 123 456", "+359888123456"],
  ["+359 88 812 3456", "+359888123456"],
  ["00359888123456", "+359888123456"],
  ["(02) 987 6543", "+35929876543"],
  ["032-60-60-60", "+35932606060"],
  ["+359 0888 123 456", "+359888123456"],
  ["00359 0888 123 456", "+359888123456"],
] as const) {
  test(`a Bulgarian number typed as "${typed}" is stored as ${stored} on the order and the customer`, async () => {
    assert.deepEqual(await storedContact(typed), {
      contactPhone: stored,
      customer: { phone: stored },
    });
  });
}

for (const phone of [
  "0888 12a 456",
  "+44 20 7946 0958",
  "0888 123",
  "0088812345678",
  "888123456",
  "0888 123 4567",
  "",
]) {
  test(`"${phone}" is refused as a phone number`, async () => {
    const result = await placeOrder(validCheckoutInput({ phone }), null);

    assert.deepEqual(result, {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: ["phone"],
    });
  });
}
