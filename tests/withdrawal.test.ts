import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { resetRateLimits } from "@/lib/rate-limit";
import { WITHDRAWAL_RATE_LIMIT, withdrawFromOrder } from "@/lib/withdrawal";
import {
  INCOMPLETE_WITHDRAWAL,
  NOT_FOUND,
  WITHDRAWAL_REFUSED,
  withdrawalSummaryError,
} from "@/lib/withdrawal-messages";
import { withdrawalPayload } from "@/lib/withdrawal-payload";

import { validCheckoutInput } from "./support/checkout";

before(() => {
  resetRateLimits();
});

after(async () => {
  resetRateLimits();
  await prisma.$disconnect();
});

async function placedOrder() {
  const email = `withdraw-${randomUUID()}@example.com`;
  const result = await placeOrder(
    validCheckoutInput({ email, phone: "0888 123 456" }),
    null,
  );

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("unreachable");

  return {
    reference: result.order.reference,
    name: "Иван Иванов",
    email,
    phone: "0888123456",
  };
}

function withdrawnAt(reference: string) {
  return prisma.order
    .findUniqueOrThrow({ where: { reference }, select: { withdrawnAt: true } })
    .then((order) => order.withdrawnAt);
}

test("a matching reference, phone and email records the withdrawal time on the order", async () => {
  const input = await placedOrder();
  const now = new Date("2026-10-18T09:30:00Z");

  const result = await withdrawFromOrder(input, null, now);

  assert.deepEqual(result, {
    ok: true,
    reference: input.reference,
    withdrawnAt: now,
    repeated: false,
    sent: false,
  });
  assert.deepEqual(await withdrawnAt(input.reference), now);
});

test("a withdrawal from an order already sent says so, so the buyer is told about the return", async () => {
  const input = await placedOrder();
  await prisma.order.update({
    where: { reference: input.reference },
    data: { sentAt: new Date("2026-10-17T10:00:00Z") },
  });

  const result = await withdrawFromOrder(input, null);

  assert.equal(result.ok && result.sent, true);
});

test("the reference, phone and email match however the buyer spells them", async () => {
  const input = await placedOrder();

  const result = await withdrawFromOrder(
    {
      ...input,
      reference: ` ${input.reference.toLowerCase()} `,
      email: ` ${input.email.toUpperCase()} `,
      phone: "+359 88 812 3456",
    },
    null,
  );

  assert.equal(result.ok, true);
});

test("a second withdrawal keeps the first time and says it was repeated", async () => {
  const input = await placedOrder();
  const first = new Date("2026-10-18T09:30:00Z");

  await withdrawFromOrder(input, null, first);
  const second = await withdrawFromOrder(
    input,
    null,
    new Date("2026-10-19T12:00:00Z"),
  );

  assert.deepEqual(second, {
    ok: true,
    reference: input.reference,
    withdrawnAt: first,
    repeated: true,
    sent: false,
  });
  assert.deepEqual(await withdrawnAt(input.reference), first);
});

test("two withdrawals arriving together record one time, and both report it", async () => {
  const input = await placedOrder();
  const first = new Date("2026-10-18T09:30:00Z");
  const second = new Date("2026-10-18T09:30:01Z");

  const results = await Promise.all([
    withdrawFromOrder(input, null, first),
    withdrawFromOrder(input, null, second),
  ]);

  const stored = await withdrawnAt(input.reference);
  assert.ok(stored);
  assert.deepEqual(
    results.map((result) => (result.ok ? result.repeated : null)).sort(),
    [false, true],
  );
  for (const result of results) {
    assert.equal(result.ok && result.withdrawnAt.getTime(), stored.getTime());
  }
});

test("a reference that is not in the order format is a field error and spends no attempt", async () => {
  resetRateLimits();
  const input = await placedOrder();
  const ip = "198.51.100.90";

  for (let i = 0; i <= WITHDRAWAL_RATE_LIMIT.limit; i++) {
    const result = await withdrawFromOrder({ ...input, reference: "BP1" }, ip);
    assert.deepEqual(result, {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: ["reference"],
    });
  }

  const allowed = await withdrawFromOrder(input, ip);
  assert.equal(allowed.ok, true);
});

test("an unknown reference and a mismatched phone or email get the same answer and record nothing", async () => {
  const input = await placedOrder();

  const answers = await Promise.all([
    withdrawFromOrder({ ...input, reference: "BP0101990" }, null),
    withdrawFromOrder({ ...input, phone: "0888999999" }, null),
    withdrawFromOrder({ ...input, email: "someone-else@example.com" }, null),
  ]);

  for (const answer of answers) {
    assert.deepEqual(answer, { ok: false, code: "NOT_FOUND" });
  }
  assert.equal(await withdrawnAt(input.reference), null);
});

test("the name is required but not matched against the order", async () => {
  const input = await placedOrder();

  const missing = await withdrawFromOrder({ ...input, name: "" }, null);
  assert.deepEqual(missing, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["name"],
  });

  const different = await withdrawFromOrder(
    { ...input, name: "Петър Петров" },
    null,
  );
  assert.equal(different.ok, true);
});

test("every field is required and reported by name", async () => {
  const result = await withdrawFromOrder(
    withdrawalPayload(new FormData()),
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_ERROR",
    fields: ["reference", "name", "email", "phone"],
  });
});

test("a filled honeypot is refused like the rate limit and records nothing", async () => {
  const input = await placedOrder();

  const result = await withdrawFromOrder(
    { ...input, website: "https://spam.example" },
    null,
  );

  assert.deepEqual(result, { ok: false, code: "REJECTED" });
  assert.equal(await withdrawnAt(input.reference), null);
});

test("an address is refused after the configured number of attempts, matching or not", async () => {
  resetRateLimits();
  const input = await placedOrder();
  const ip = "198.51.100.70";

  for (let i = 0; i < WITHDRAWAL_RATE_LIMIT.limit; i++) {
    const miss = await withdrawFromOrder(
      { ...input, reference: "BP0101990" },
      ip,
    );
    assert.deepEqual(miss, { ok: false, code: "NOT_FOUND" });
  }

  const blocked = await withdrawFromOrder(input, ip);
  assert.deepEqual(blocked, { ok: false, code: "REJECTED" });
  assert.equal(await withdrawnAt(input.reference), null);

  const otherAddress = await withdrawFromOrder(input, "198.51.100.71");
  assert.equal(otherAddress.ok, true);
});

test("withdrawal attempts do not spend the same address's order limit", async () => {
  resetRateLimits();
  const ip = "198.51.100.80";

  for (let i = 0; i < WITHDRAWAL_RATE_LIMIT.limit; i++) {
    await withdrawFromOrder(
      {
        reference: "BP0101990",
        name: "Иван Иванов",
        email: "nobody@example.com",
        phone: "0888123456",
      },
      ip,
    );
  }

  const order = await placeOrder(validCheckoutInput(), ip);
  assert.equal(order.ok, true);
});

test("the payload reads a file sent under a field name as an empty string", () => {
  const formData = new FormData();
  formData.append("reference", new File(["x"], "x.txt"));
  formData.append("email", "a@example.com");

  assert.deepEqual(withdrawalPayload(formData), {
    reference: "",
    name: "",
    email: "a@example.com",
    phone: "",
    website: "",
  });
});

test("the summary names a missing order, a refusal and a field the form cannot show", () => {
  assert.equal(withdrawalSummaryError(null), null);
  assert.equal(
    withdrawalSummaryError({ ok: false, code: "NOT_FOUND" }),
    NOT_FOUND,
  );
  assert.equal(
    withdrawalSummaryError({ ok: false, code: "REJECTED" }),
    WITHDRAWAL_REFUSED,
  );
  assert.equal(
    withdrawalSummaryError({
      ok: false,
      code: "VALIDATION_ERROR",
      fields: ["email"],
    }),
    null,
  );
  assert.equal(
    withdrawalSummaryError({
      ok: false,
      code: "VALIDATION_ERROR",
      fields: ["website"],
    }),
    INCOMPLETE_WITHDRAWAL,
  );
});
