import assert from "node:assert/strict";
import { after, test } from "node:test";

import { applyOrderStep, listOrders } from "@/lib/admin-orders";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { withdrawFromOrder } from "@/lib/withdrawal";

import { validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const ADMIN = "owner@example.com";

async function place(overrides: Record<string, unknown> = {}) {
  const input = validCheckoutInput(overrides);
  const result = await placeOrder(input, null);
  if (!result.ok) throw new Error("order was refused");
  return { ...result.order, input };
}

function events(reference: string) {
  return prisma.orderEvent.findMany({
    where: { order: { reference } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { kind: true, adminEmail: true, createdAt: true },
  });
}

test("a placed order starts its history with one placed event", async () => {
  const { reference } = await place();

  assert.deepEqual(
    (await events(reference)).map(({ kind, adminEmail }) => ({
      kind,
      adminEmail,
    })),
    [{ kind: "PLACED", adminEmail: null }],
  );
});

test("a replayed submission adds no second placed event", async () => {
  const input = validCheckoutInput();
  const first = await placeOrder(input, null);
  const replay = await placeOrder(input, null);
  if (!first.ok || !replay.ok) throw new Error("order was refused");

  assert.equal(replay.repeated, true);
  assert.equal((await events(first.order.reference)).length, 1);
});

test("each step records who took it and when, in order", async () => {
  const { reference } = await place();
  const sentAt = new Date("2030-10-20T08:00:00Z");
  const paidAt = new Date("2030-10-21T09:30:00Z");

  assert.deepEqual(
    await applyOrderStep(reference, "send", "new", sentAt, false, ADMIN),
    { ok: true },
  );
  assert.deepEqual(
    await applyOrderStep(reference, "pay", "sent", paidAt, false, null),
    { ok: true },
  );

  assert.deepEqual((await events(reference)).slice(1), [
    { kind: "SEND", adminEmail: ADMIN, createdAt: sentAt },
    { kind: "PAY", adminEmail: null, createdAt: paidAt },
  ]);
});

test("an undo is an event of its own and keeps the step it took back", async () => {
  const { reference } = await place();
  const sentAt = new Date("2030-10-20T08:00:00Z");
  const undoneAt = new Date("2030-10-20T08:05:00Z");

  await applyOrderStep(reference, "send", "new", sentAt, false, ADMIN);
  await applyOrderStep(reference, "undo", "sent", undoneAt, false, ADMIN);

  assert.deepEqual(
    (await events(reference)).slice(1).map(({ kind }) => kind),
    ["SEND", "UNDO"],
  );
});

test("a step refused before writing records nothing", async () => {
  const { reference } = await place();

  assert.deepEqual(await applyOrderStep(reference, "pay", "new"), {
    ok: false,
    reason: "refused",
  });
  assert.deepEqual(await applyOrderStep(reference, "send", "sent"), {
    ok: false,
    reason: "stale",
  });

  assert.equal((await events(reference)).length, 1);
});

test("two screens taking the same step record it once", async () => {
  const { reference } = await place();

  const results = await Promise.all([
    applyOrderStep(reference, "send", "new"),
    applyOrderStep(reference, "send", "new"),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.deepEqual(
    (await events(reference)).map(({ kind }) => kind),
    ["PLACED", "SEND"],
  );
});

test("a withdrawal is recorded in the history once, however often it is sent", async () => {
  const { reference, input } = await place();
  const request = {
    reference,
    name: "Иван Иванов",
    phone: input.phone,
    email: input.email,
  };

  const [first] = await Promise.all([
    withdrawFromOrder(request, null),
    withdrawFromOrder(request, null),
  ]);
  await withdrawFromOrder(request, null);
  if (!first.ok) throw new Error("withdrawal was refused");

  const history = await events(reference);

  assert.deepEqual(
    history.map(({ kind }) => kind),
    ["PLACED", "WITHDRAWN"],
  );
  assert.deepEqual(history[1].createdAt, first.withdrawnAt);
});

test("the order list carries each order's history, oldest first", async () => {
  const { reference } = await place();
  await applyOrderStep(
    reference,
    "send",
    "new",
    new Date("2030-01-01T00:00:00Z"),
    false,
    ADMIN,
  );

  const [listed] = await listOrders("all", 1);

  assert.equal(listed.reference, reference);
  assert.deepEqual(
    listed.events.map(({ kind, adminEmail }) => ({ kind, adminEmail })),
    [
      { kind: "PLACED", adminEmail: null },
      { kind: "SEND", adminEmail: ADMIN },
    ],
  );
});
