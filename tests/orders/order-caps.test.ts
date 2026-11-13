import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, test } from "node:test";

import { inboxOf, ORDER_CAPS, placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";

import { distinctBuyer, validCheckoutInput } from "../support/checkout";

beforeEach(() => {
  resetRateLimits();
});

after(async () => {
  resetRateLimits();
  await prisma.$disconnect();
});

let addresses = 0;

function freshIp() {
  addresses += 1;
  return `10.0.${Math.floor(addresses / 250)}.${(addresses % 250) + 1}`;
}

test("the shop takes the overall hourly number of orders and refuses the next, whoever sends it", async () => {
  for (let i = 0; i < ORDER_CAPS.overall.limit; i++) {
    const result = await placeOrder(
      validCheckoutInput(distinctBuyer()),
      freshIp(),
    );
    assert.equal(result.ok, true, `order ${i + 1}`);
  }

  const idempotencyKey = randomUUID();
  const refused = await placeOrder(
    validCheckoutInput({ ...distinctBuyer(), idempotencyKey }),
    freshIp(),
  );

  assert.deepEqual(refused, { ok: false, code: "REJECTED" });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("one email gets the daily number of orders from any address and phone, however it is written, and a different email still orders", async () => {
  const email = `capped-${randomUUID()}@example.com`;

  for (let i = 0; i < ORDER_CAPS.perContact.limit; i++) {
    const result = await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      freshIp(),
    );
    assert.equal(result.ok, true, `order ${i + 1}`);
  }

  const refused = await placeOrder(
    validCheckoutInput({
      ...distinctBuyer(),
      email: ` ${email.toUpperCase()}`,
    }),
    freshIp(),
  );
  assert.deepEqual(refused, { ok: false, code: "REJECTED" });

  const other = await placeOrder(
    validCheckoutInput(distinctBuyer()),
    freshIp(),
  );
  assert.equal(other.ok, true);
});

test("one phone gets the daily number of orders from any address and email, however it is written", async () => {
  const { phone } = distinctBuyer();

  for (let i = 0; i < ORDER_CAPS.perContact.limit; i++) {
    const result = await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), phone }),
      freshIp(),
    );
    assert.equal(result.ok, true, `order ${i + 1}`);
  }

  const refused = await placeOrder(
    validCheckoutInput({
      ...distinctBuyer(),
      phone: `+359 ${phone.slice(1)}`,
    }),
    freshIp(),
  );
  assert.deepEqual(refused, { ok: false, code: "REJECTED" });
});

test("an order refused for its email spends none of the overall allowance", async () => {
  const email = `capped-${randomUUID()}@example.com`;

  for (let i = 0; i < ORDER_CAPS.perContact.limit; i++) {
    await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      freshIp(),
    );
  }
  for (let i = 0; i < ORDER_CAPS.overall.limit; i++) {
    await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      freshIp(),
    );
  }

  let accepted = 0;
  for (let i = ORDER_CAPS.perContact.limit; i < ORDER_CAPS.overall.limit; i++) {
    const result = await placeOrder(
      validCheckoutInput(distinctBuyer()),
      freshIp(),
    );
    if (result.ok) accepted += 1;
  }

  assert.equal(
    accepted,
    ORDER_CAPS.overall.limit - ORDER_CAPS.perContact.limit,
  );
});

test("a submission replayed after the caps are reached still answers with the order it placed", async () => {
  const email = `capped-${randomUUID()}@example.com`;
  const first = validCheckoutInput({ ...distinctBuyer(), email });
  const placed = await placeOrder(first, freshIp());
  assert.equal(placed.ok, true);

  for (let i = 1; i < ORDER_CAPS.perContact.limit; i++) {
    await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      freshIp(),
    );
  }

  const replayed = await placeOrder(first, freshIp());
  assert.equal(replayed.ok, true);
  assert.equal(replayed.ok && replayed.repeated, true);
  assert.equal(
    replayed.ok && replayed.order.reference,
    placed.ok && placed.order.reference,
  );
});

test("addresses that reach one Gmail inbox share its daily number of orders", async () => {
  const name = `victim${randomUUID().slice(0, 8)}`;
  const spelled = [
    `${name}+1@gmail.com`,
    `${name}+2@gmail.com`,
    `${name.slice(0, 3)}.${name.slice(3)}@gmail.com`,
  ];

  for (const email of spelled) {
    const result = await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      freshIp(),
    );
    assert.equal(result.ok, true, email);
  }

  const refused = await placeOrder(
    validCheckoutInput({ ...distinctBuyer(), email: `${name}@googlemail.com` }),
    freshIp(),
  );
  assert.deepEqual(refused, { ok: false, code: "REJECTED" });
});

test("an inbox is the address without its plus tag, and Gmail's without its dots", () => {
  assert.equal(inboxOf("ivan+shop@example.com"), "ivan@example.com");
  assert.equal(inboxOf("i.van@example.com"), "i.van@example.com");
  assert.equal(inboxOf("i.van+x@googlemail.com"), "ivan@gmail.com");
  assert.equal(inboxOf("ivan@abv.bg"), "ivan@abv.bg");
});

test("a submission refused for an unknown office or an unavailable product spends none of the allowance", async () => {
  for (let i = 0; i < ORDER_CAPS.overall.limit; i++) {
    const office = await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), officeCode: "no-such-office" }),
      freshIp(),
    );
    assert.equal(!office.ok && office.code, "UNKNOWN_OFFICE");

    const product = await placeOrder(
      validCheckoutInput({
        ...distinctBuyer(),
        items: [{ slug: "no-such-product", quantity: 1 }],
      }),
      freshIp(),
    );
    assert.equal(!product.ok && product.code, "UNAVAILABLE_ITEMS");
  }

  const real = await placeOrder(validCheckoutInput(distinctBuyer()), freshIp());
  assert.equal(real.ok, true);
});

test("the caps do not apply to a submission with no IP address", async () => {
  const email = `uncapped-${randomUUID()}@example.com`;

  for (let i = 0; i <= ORDER_CAPS.perContact.limit; i++) {
    const result = await placeOrder(
      validCheckoutInput({ ...distinctBuyer(), email }),
      null,
    );
    assert.equal(result.ok, true, `order ${i + 1}`);
  }
});
