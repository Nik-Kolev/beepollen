import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { applyOrderStep } from "@/lib/admin-orders";
import { deliveryPrice } from "@/lib/delivery";
import { officeLabel } from "@/lib/econt";
import { parseOrderChanges } from "@/lib/order-change";
import { signEmailToken } from "@/lib/email-token";
import { editOrderContact } from "@/lib/order-edit";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { confirmSubscription, isSubscribed } from "@/lib/subscriptions";
import { withdrawFromOrder } from "@/lib/withdrawal";

import { TEST_OFFICE_CODE, validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

async function place(overrides: Record<string, unknown> = {}) {
  const result = await placeOrder(validCheckoutInput(overrides), null);
  if (!result.ok) throw new Error("order was refused");
  return result.order.reference;
}

async function shown(reference: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { reference },
    select: {
      contactName: true,
      contactPhone: true,
      customer: { select: { email: true } },
      deliveryMethod: true,
      officeCode: true,
    },
  });
  return {
    name: order.contactName,
    email: order.customer.email,
    phone: order.contactPhone,
    deliveryMethod: order.deliveryMethod,
    officeCode: order.officeCode ?? "",
  };
}

async function editInput(
  reference: string,
  overrides: Record<string, unknown> = {},
) {
  const original = await shown(reference);
  return { reference, original, ...original, ...overrides };
}

async function withOffice<T>(
  city: string,
  run: (code: string) => Promise<T>,
): Promise<T> {
  const office = await prisma.deliveryOffice.create({
    data: {
      carrier: "ECONT",
      code: `test-${randomUUID()}`,
      name: "Тестов офис",
      city,
      postCode: "0000",
      street: "ул. Тестова 2",
      hours: "09:00 – 18:00",
      phone: null,
      latitude: null,
      longitude: null,
    },
  });
  try {
    return await run(office.code);
  } finally {
    await prisma.deliveryOffice.delete({ where: { id: office.id } });
  }
}

function orderOf(reference: string) {
  return prisma.order.findUniqueOrThrow({
    where: { reference },
    include: { customer: true, events: { orderBy: { id: "asc" } } },
  });
}

function officeText(order: {
  officeName: string | null;
  officeCity: string | null;
  officeStreet: string | null;
}) {
  return `${officeLabel(order.officeName ?? "", order.officeCity ?? "")}, ${order.officeStreet}`;
}

test("a new name and phone are written to the order and the customer, with an event naming each change", async () => {
  const reference = await place();
  const now = new Date("2026-10-27T10:00:00Z");

  const result = await editOrderContact(
    await editInput(reference, { name: "Петър Петров", phone: "0899 111 222" }),
    { now, adminEmail: "owner@example.com" },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const expected = [
    { field: "name", from: "Иван Иванов", to: "Петър Петров" },
    { field: "phone", from: "+359888123456", to: "+359899111222" },
  ];
  assert.deepEqual(result.changes, expected);

  const order = await orderOf(reference);
  assert.equal(order.contactName, "Петър Петров");
  assert.equal(order.contactPhone, "+359899111222");
  assert.equal(order.customer.name, "Петър Петров");
  assert.equal(order.customer.phone, "+359899111222");

  const event = order.events.at(-1);
  assert.equal(event?.kind, "EDIT");
  assert.equal(event?.id, result.eventId);
  assert.equal(event?.adminEmail, "owner@example.com");
  assert.deepEqual(event?.createdAt, now);
  assert.deepEqual(event?.changes, expected);
});

test("a corrected email moves the order to that customer and deletes the misspelled one left with no orders", async () => {
  const misspelled = `typo-${randomUUID()}@example.com`;
  const reference = await place({ email: misspelled });
  const before = await orderOf(reference);
  const corrected = `Fixed-${randomUUID()}@Example.com `;

  const result = await editOrderContact(
    await editInput(reference, { email: corrected }),
  );

  assert.equal(result.ok, true);
  const order = await orderOf(reference);
  assert.equal(order.customer.email, corrected.trim().toLowerCase());
  assert.notEqual(order.customerId, before.customerId);
  assert.equal(
    await prisma.customer.count({ where: { email: misspelled } }),
    0,
  );
});

test("a corrected email joins an existing customer and keeps the old one while it has other orders", async () => {
  const shared = `shared-${randomUUID()}@example.com`;
  const existing = `existing-${randomUUID()}@example.com`;
  const reference = await place({ email: shared });
  await place({ email: shared });
  await place({ email: existing });

  const result = await editOrderContact(
    await editInput(reference, { email: existing }),
  );

  assert.equal(result.ok, true);
  const order = await orderOf(reference);
  assert.equal(order.customer.email, existing);
  assert.equal(await prisma.customer.count({ where: { email: shared } }), 1);
  assert.equal(await prisma.customer.count({ where: { email: existing } }), 1);
});

test("another office is read back and snapshotted, and the same method keeps the delivery price", async () => {
  const reference = await place();
  await prisma.order.update({
    where: { reference },
    data: {
      deliveryCents: 123,
      totalCents: { increment: 123 - deliveryPrice("ECONT_OFFICE") },
    },
  });
  const before = await orderOf(reference);

  const result = await withOffice("Тестово", async (code) =>
    editOrderContact(await editInput(reference, { officeCode: code })),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.changes, [
    {
      field: "delivery",
      from: officeText(before),
      to: "Тестово, Тестов офис, ул. Тестова 2",
    },
  ]);
  const order = await orderOf(reference);
  assert.equal(order.officeName, "Тестов офис");
  assert.equal(order.officeCity, "Тестово");
  assert.equal(order.officeStreet, "ул. Тестова 2");
  assert.equal(order.deliveryCents, 123);
});

test("switching to Попово clears the office and reprices delivery and the total", async () => {
  const reference = await place();
  const before = await orderOf(reference);

  const result = await editOrderContact(
    await editInput(reference, { deliveryMethod: "LOCAL", officeCode: "" }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.changes, [
    {
      field: "delivery",
      from: officeText(before),
      to: "Попово — на ръка",
    },
    { field: "deliveryCents", from: before.deliveryCents, to: 0 },
    { field: "totalCents", from: before.totalCents, to: before.itemsCents },
  ]);
  const order = await orderOf(reference);
  assert.equal(order.deliveryMethod, "LOCAL");
  assert.equal(order.officeCarrier, null);
  assert.equal(order.officeCode, null);
  assert.equal(order.officeName, null);
  assert.equal(order.officeCity, null);
  assert.equal(order.officeStreet, null);
  assert.equal(order.deliveryCents, 0);
  assert.equal(order.totalCents, order.itemsCents);
});

test("switching from Попово to an office prices the office delivery", async () => {
  const reference = await place({ deliveryMethod: "LOCAL", officeCode: "" });

  const result = await editOrderContact(
    await editInput(reference, {
      deliveryMethod: "ECONT_OFFICE",
      officeCode: TEST_OFFICE_CODE,
    }),
  );

  assert.equal(result.ok, true);
  const order = await orderOf(reference);
  assert.equal(order.officeCode, TEST_OFFICE_CODE);
  assert.equal(order.deliveryCents, deliveryPrice("ECONT_OFFICE"));
  assert.equal(order.totalCents, order.itemsCents + order.deliveryCents);
});

test("an unknown office and an office in Попово are refused and write nothing", async () => {
  const reference = await place();

  const unknown = await editOrderContact(
    await editInput(reference, { officeCode: "no-such-office" }),
  );
  const popovo = await withOffice("Попово", async (code) =>
    editOrderContact(await editInput(reference, { officeCode: code })),
  );

  assert.deepEqual(unknown, { ok: false, reason: "UNKNOWN_OFFICE" });
  assert.deepEqual(popovo, { ok: false, reason: "UNKNOWN_OFFICE" });
  const order = await orderOf(reference);
  assert.equal(order.officeCode, TEST_OFFICE_CODE);
  assert.equal(order.events.length, 1);
});

test("an office dropped from the table since checkout does not block editing the phone", async () => {
  const reference = await withOffice("Тестово", (code) =>
    place({ officeCode: code }),
  );

  const result = await editOrderContact(
    await editInput(reference, { phone: "0899111222" }),
  );

  assert.equal(result.ok, true);
  const order = await orderOf(reference);
  assert.equal(order.officeCity, "Тестово");
  assert.equal(order.contactPhone, "+359899111222");
});

test("an edit made from values the order no longer holds is stale and writes nothing", async () => {
  const reference = await place();
  const input = await editInput(reference, { name: "Петър Петров" });
  await prisma.order.update({
    where: { reference },
    data: { contactName: "Мария Иванова" },
  });

  const result = await editOrderContact(input);

  assert.deepEqual(result, { ok: false, reason: "stale" });
  const order = await orderOf(reference);
  assert.equal(order.contactName, "Мария Иванова");
  assert.equal(order.events.length, 1);
});

test("two edits made from the same values save one and call the other stale", async () => {
  const reference = await place();
  const first = await editInput(reference, { name: "Петър Петров" });
  const second = await editInput(reference, { name: "Мария Иванова" });

  const results = await Promise.all([
    editOrderContact(first),
    editOrderContact(second),
  ]);

  assert.deepEqual(
    results.map((result) => (result.ok ? "ok" : result.reason)).sort(),
    ["ok", "stale"],
  );
  const order = await orderOf(reference);
  assert.equal(order.events.filter((event) => event.kind === "EDIT").length, 1);
});

test("the stale one of two email corrections leaves no customer behind", async () => {
  const reference = await place();
  const winners = [
    `first-${randomUUID()}@example.com`,
    `second-${randomUUID()}@example.com`,
  ];
  const inputs = await Promise.all(
    winners.map((email) => editInput(reference, { email })),
  );

  const results = await Promise.all(
    inputs.map((input) => editOrderContact(input)),
  );

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(
    await prisma.customer.count({ where: { email: { in: winners } } }),
    1,
  );
});

test("an order that was sent, cancelled or withdrawn is refused", async () => {
  const sent = await place();
  await applyOrderStep(sent, "send", "new");
  const cancelled = await place();
  await applyOrderStep(cancelled, "cancel", "new");
  const withdrawn = await place();
  const withdrawal = await withdrawFromOrder(
    {
      reference: withdrawn,
      email: (await shown(withdrawn)).email,
      name: "Иван Иванов",
      phone: "0888123456",
    },
    null,
  );
  assert.equal(withdrawal.ok, true);

  for (const reference of [sent, cancelled, withdrawn]) {
    const result = await editOrderContact(
      await editInput(reference, { name: "Петър Петров" }),
    );
    assert.deepEqual(result, { ok: false, reason: "refused" });
    assert.equal((await orderOf(reference)).contactName, "Иван Иванов");
  }
  assert.deepEqual(
    await editOrderContact(await editInput(sent, { reference: "BP0000000" })),
    { ok: false, reason: "refused" },
  );
});

test("saving unchanged values writes no event", async () => {
  const reference = await place();

  const result = await editOrderContact(
    await editInput(reference, { phone: "+359 888 123 456" }),
  );

  assert.deepEqual(result, {
    ok: true,
    reference,
    eventId: null,
    changes: [],
    offersUnconfirmed: false,
  });
  assert.equal((await orderOf(reference)).events.length, 1);
});

test("invalid values are refused naming their fields", async () => {
  const reference = await place();

  const result = await editOrderContact(
    await editInput(reference, {
      phone: "+44 20 7946 0958",
      email: "not-an-email",
      officeCode: "",
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok || result.reason !== "VALIDATION_ERROR") return;
  assert.deepEqual(result.fields.sort(), ["email", "officeCode", "phone"]);
});

function offersOf(reference: string) {
  return prisma.consent.findFirst({
    where: { order: { reference }, kind: "OFFERS" },
  });
}

test("a corrected email restarts a confirmed offers consent, so the old address's link no longer subscribes anyone", async () => {
  const reference = await place({ acceptsOffers: true });
  const before = await offersOf(reference);
  if (!before) throw new Error("no offers consent");
  const oldLink = signEmailToken("confirm", before.id);
  assert.equal(await confirmSubscription(oldLink), "confirmed");

  const result = await editOrderContact(
    await editInput(reference, { email: `fixed-${randomUUID()}@example.com` }),
  );

  assert.equal(result.ok && result.offersUnconfirmed, true);
  const after = await offersOf(reference);
  assert.notEqual(after?.id, before.id);
  assert.equal(after?.confirmedAt, null);
  assert.equal(after?.withdrawnAt, null);
  assert.equal(after?.wording, before.wording);
  assert.deepEqual(after?.createdAt, before.createdAt);
  assert.equal(await confirmSubscription(oldLink), "invalid");
  const order = await orderOf(reference);
  assert.equal(await isSubscribed(order.customerId), false);
});

test("a corrected email flags an unconfirmed offers consent for a new confirmation", async () => {
  const reference = await place({ acceptsOffers: true });

  const result = await editOrderContact(
    await editInput(reference, { email: `fixed-${randomUUID()}@example.com` }),
  );

  assert.equal(result.ok && result.offersUnconfirmed, true);
});

test("no confirmation is flagged when the email is unchanged, the consent is withdrawn or there is none", async () => {
  const unchangedEmail = await place({ acceptsOffers: true });
  const withdrawn = await place({ acceptsOffers: true });
  await prisma.consent.updateMany({
    where: { order: { reference: withdrawn }, kind: "OFFERS" },
    data: { withdrawnAt: new Date() },
  });
  const none = await place();

  const results = [
    await editOrderContact(
      await editInput(unchangedEmail, { name: "Петър Петров" }),
    ),
    await editOrderContact(
      await editInput(withdrawn, { email: `w-${randomUUID()}@example.com` }),
    ),
    await editOrderContact(
      await editInput(none, { email: `n-${randomUUID()}@example.com` }),
    ),
  ];

  for (const result of results) {
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.offersUnconfirmed, false);
  }
  const kept = await offersOf(withdrawn);
  assert.notEqual(kept?.withdrawnAt, null);
});

test("fixing one field of an older order leaves the customer's newer contact alone", async () => {
  const email = `repeat-${randomUUID()}@example.com`;
  const older = await place({ email });
  await place({ email, name: "Иван Петров", phone: "0877000111" });

  const result = await editOrderContact(
    await editInput(older, { name: "Иван Иванов-Попов" }),
  );

  assert.equal(result.ok, true);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { email },
  });
  assert.equal(customer.name, "Иван Иванов-Попов");
  assert.equal(customer.phone, "+359877000111");
});

test("moving an order to an existing customer leaves that customer's contact alone", async () => {
  const existing = `existing-${randomUUID()}@example.com`;
  await place({ email: existing, name: "Мария Иванова", phone: "0877000111" });
  const reference = await place();

  const result = await editOrderContact(
    await editInput(reference, { email: existing }),
  );

  assert.equal(result.ok, true);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { email: existing },
  });
  assert.equal(customer.name, "Мария Иванова");
  assert.equal(customer.phone, "+359877000111");
});

test("a name too short, a malformed original and an unknown delivery method are refused", async () => {
  const reference = await place();

  const results = [
    await editOrderContact(await editInput(reference, { name: "И" })),
    await editOrderContact({
      ...(await editInput(reference)),
      original: { officeCode: 5 },
    }),
    await editOrderContact(
      await editInput(reference, { deliveryMethod: "DRONE" }),
    ),
  ];

  assert.deepEqual(
    results.map((result) =>
      !result.ok && result.reason === "VALIDATION_ERROR" ? result.fields : null,
    ),
    [["name"], ["original"], ["deliveryMethod"]],
  );
  assert.equal((await orderOf(reference)).events.length, 1);
});

test("a stray office code on a Попово order is no change", async () => {
  const reference = await place({ deliveryMethod: "LOCAL", officeCode: "" });

  const result = await editOrderContact(
    await editInput(reference, { officeCode: TEST_OFFICE_CODE }),
  );

  assert.deepEqual(result, {
    ok: true,
    reference,
    eventId: null,
    changes: [],
    offersUnconfirmed: false,
  });
});

test("an edit made from another delivery method or office than the order holds is stale", async () => {
  const reference = await place();
  const { original } = await editInput(reference);

  const results = [
    await editOrderContact({
      ...(await editInput(reference, { name: "Петър Петров" })),
      original: { ...original, deliveryMethod: "LOCAL" },
    }),
    await editOrderContact({
      ...(await editInput(reference, { name: "Петър Петров" })),
      original: { ...original, officeCode: "another-office" },
    }),
  ];

  assert.deepEqual(results, [
    { ok: false, reason: "stale" },
    { ok: false, reason: "stale" },
  ]);
});

test("a dry run lists the changes and writes nothing", async () => {
  const reference = await place({ acceptsOffers: true });
  const before = await orderOf(reference);
  const offers = await offersOf(reference);

  const result = await editOrderContact(
    await editInput(reference, {
      phone: "0899111222",
      email: `fixed-${randomUUID()}@example.com`,
    }),
    { dryRun: true },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.eventId, null);
  assert.deepEqual(
    result.changes.map((change) => change.field),
    ["email", "phone"],
  );
  const after = await orderOf(reference);
  assert.equal(after.contactPhone, before.contactPhone);
  assert.equal(after.customerId, before.customerId);
  assert.equal(after.events.length, before.events.length);
  assert.equal((await offersOf(reference))?.id, offers?.id);
});

test("history changes that do not match the expected shape render as none", () => {
  assert.deepEqual(parseOrderChanges(null), []);
  assert.deepEqual(parseOrderChanges([{ field: "phone", from: 1, to: 2 }]), []);
  assert.deepEqual(
    parseOrderChanges([{ field: "totalCents", from: 100, to: 200 }]),
    [{ field: "totalCents", from: 100, to: 200 }],
  );
});
