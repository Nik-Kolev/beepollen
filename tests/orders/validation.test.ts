import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { MAX_LINES } from "@/lib/cart";
import { ORDER_RATE_LIMIT, placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";

import { validCheckoutInput } from "../support/checkout";

const UNPUBLISHED_SLUG = "test-unpublished-product";
const SOLD_OUT_SLUG = "test-sold-out-product";
const FREE_SLUG = "test-free-product";

before(async () => {
  await prisma.product.createMany({
    data: [
      {
        slug: UNPUBLISHED_SLUG,
        name: "Test unpublished product",
        summary: "test",
        description: "test",
        priceCents: 1000,
        isPublished: false,
      },
      {
        slug: SOLD_OUT_SLUG,
        name: "Test sold out product",
        summary: "test",
        description: "test",
        priceCents: 1000,
        isPublished: true,
        stock: "NONE",
      },
      {
        slug: FREE_SLUG,
        name: "Test free product",
        summary: "test",
        description: "test",
        priceCents: 0,
        isPublished: true,
      },
    ],
  });
});

after(async () => {
  await prisma.product.deleteMany({
    where: { slug: { in: [UNPUBLISHED_SLUG, SOLD_OUT_SLUG, FREE_SLUG] } },
  });
  await prisma.$disconnect();
});

test("rejects an unpublished product as unavailable and writes nothing", async () => {
  const idempotencyKey = randomUUID();
  const result = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: UNPUBLISHED_SLUG, quantity: 1 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "UNAVAILABLE_ITEMS",
    slugs: [UNPUBLISHED_SLUG],
  });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("rejects a slug that does not exist as unavailable and writes nothing", async () => {
  const idempotencyKey = randomUUID();
  const result = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: "no-such-product-slug", quantity: 1 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "UNAVAILABLE_ITEMS",
    slugs: ["no-such-product-slug"],
  });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("rejects a sold-out product as unavailable and writes nothing", async () => {
  const idempotencyKey = randomUUID();
  const result = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: SOLD_OUT_SLUG, quantity: 1 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "UNAVAILABLE_ITEMS",
    slugs: [SOLD_OUT_SLUG],
  });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("rejects a product priced at zero as unavailable and writes nothing", async () => {
  const idempotencyKey = randomUUID();
  const result = await placeOrder(
    validCheckoutInput({
      idempotencyKey,
      items: [{ slug: FREE_SLUG, quantity: 1 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "UNAVAILABLE_ITEMS",
    slugs: [FREE_SLUG],
  });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("rejects acceptsTerms: false, naming the field", async () => {
  const result = await placeOrder(
    validCheckoutInput({ acceptsTerms: false }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["acceptsTerms"],
  });
});

test("rejects an empty items array, naming the field", async () => {
  const result = await placeOrder(validCheckoutInput({ items: [] }), null);

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["items"],
  });
});

test("rejects a malformed email address, naming the field", async () => {
  const result = await placeOrder(
    validCheckoutInput({ email: "not-an-email" }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["email"],
  });
});

test("rejects a quantity of zero, naming the items field", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      items: [{ slug: "pchelen-prashets-500g", quantity: 0 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["items"],
  });
});

test("rejects a quantity of 100, naming the items field", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      items: [{ slug: "pchelen-prashets-500g", quantity: 100 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["items"],
  });
});

test("rejects a fractional quantity, naming the items field", async () => {
  const result = await placeOrder(
    validCheckoutInput({
      items: [{ slug: "pchelen-prashets-500g", quantity: 1.5 }],
    }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["items"],
  });
});

test("rejects a submission with more than MAX_LINES lines, naming the items field", async () => {
  const items = Array.from({ length: MAX_LINES + 1 }, (_, index) => ({
    slug: `padding-slug-${index}`,
    quantity: 1,
  }));

  const result = await placeOrder(validCheckoutInput({ items }), null);

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["items"],
  });
});

test("accepts a submission with exactly MAX_LINES lines, so the boundary itself is covered", async () => {
  const items = [
    { slug: "pchelen-prashets-500g", quantity: 1 },
    ...Array.from({ length: MAX_LINES - 1 }, (_, index) => ({
      slug: `pchelen-prashets-500g-${index}`,
      quantity: 1,
    })),
  ];

  const result = await placeOrder(validCheckoutInput({ items }), null);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(
    result.code,
    "UNAVAILABLE_ITEMS",
    "reaching the availability check proves the schema accepted MAX_LINES lines",
  );
});

test("reports a root-level sentinel rather than a field named undefined when the whole payload is not an object", async () => {
  for (const raw of [null, "garbage", 42, []]) {
    const result = await placeOrder(raw, null);

    assert.deepEqual(result, {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: ["_root"],
    });
  }
});

test("rejects a missing idempotency key, naming the field", async () => {
  const input = validCheckoutInput();
  delete input.idempotencyKey;

  const result = await placeOrder(input, null);

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["idempotencyKey"],
  });
});

test("rejects a non-uuid idempotency key, naming the field", async () => {
  const result = await placeOrder(
    validCheckoutInput({ idempotencyKey: "not-a-uuid" }),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["idempotencyKey"],
  });
});

test("rejects a name shorter than two characters, naming the field", async () => {
  const result = await placeOrder(validCheckoutInput({ name: "A" }), null);

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["name"],
  });
});

test("rejects a submission with a non-empty honeypot value and writes nothing", async () => {
  const idempotencyKey = randomUUID();
  const result = await placeOrder(
    validCheckoutInput({ idempotencyKey, website: "https://spam.example" }),
    null,
  );

  assert.deepEqual(result, { ok: false, code: "REJECTED" });
  assert.equal(await prisma.order.count({ where: { idempotencyKey } }), 0);
});

test("accepts a submission with an empty honeypot string", async () => {
  const result = await placeOrder(validCheckoutInput({ website: "" }), null);
  assert.equal(result.ok, true);
});

test("accepts a submission with the honeypot field absent entirely", async () => {
  const result = await placeOrder(validCheckoutInput(), null);
  assert.equal(result.ok, true);
});

test("a honeypot rejection is indistinguishable from a rate-limit rejection, so a bot cannot tell which check caught it", async () => {
  resetRateLimits();

  const honeypotResult = await placeOrder(
    validCheckoutInput({ website: "spam" }),
    null,
  );

  const rateLimitedIp = `honeypot-shape-${randomUUID()}`;
  for (let i = 0; i < ORDER_RATE_LIMIT.limit; i++) {
    await placeOrder(validCheckoutInput(), rateLimitedIp);
  }
  const rateLimitResult = await placeOrder(validCheckoutInput(), rateLimitedIp);

  assert.deepEqual(honeypotResult, { ok: false, code: "REJECTED" });
  assert.deepEqual(rateLimitResult, { ok: false, code: "REJECTED" });
  assert.deepEqual(honeypotResult, rateLimitResult);
});
