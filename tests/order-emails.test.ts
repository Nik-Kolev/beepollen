import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import type { EmailStatus } from "@/generated/prisma/enums";
import {
  applyOrderStep,
  type OrderStatus,
  type OrderStep,
  recordOrderStep,
} from "@/lib/admin-orders";
import { LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import type { Outgoing } from "@/lib/email/transport";
import { editOrderContact } from "@/lib/order-edit";
import {
  sendEditEmail,
  sendPlacedEmails,
  sendStepEmail,
  sendWithdrawalEmails,
} from "@/lib/order-emails";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { withdrawFromOrder } from "@/lib/withdrawal";

import { validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const OWNER = "owner@example.com";

function recorder(status: EmailStatus = "SENT") {
  const sent: Outgoing[] = [];
  const send = async (outgoing: Outgoing) => {
    sent.push(outgoing);
    return status;
  };
  return { sent, send };
}

async function place(overrides: Record<string, unknown> = {}) {
  const input = validCheckoutInput(overrides);
  const result = await placeOrder(input, null);
  if (!result.ok) throw new Error("order was refused");
  return { reference: result.order.reference, input };
}

async function statusOf(reference: string, kind: string) {
  const event = await prisma.orderEvent.findFirst({
    where: { order: { reference }, kind: kind as never },
    orderBy: { id: "desc" },
    select: { emailStatus: true },
  });
  return event?.emailStatus ?? null;
}

test("a placed order sends the buyer's confirmation and the owner's notice, and records the buyer's", async () => {
  const { reference, input } = await place();
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, OWNER);

  assert.deepEqual(
    sent.map(({ to, idempotencyKey }) => ({ to, idempotencyKey })),
    [
      { to: input.email, idempotencyKey: `order-accepted/${reference}` },
      { to: OWNER, idempotencyKey: `owner-notification/${reference}` },
    ],
  );
  assert.equal(sent[0].message.subject, `Поръчка ${reference} е приета`);
  assert.equal(await statusOf(reference, "PLACED"), "SENT");
});

test("a replayed submission resends the buyer's confirmation alone, under the same key", async () => {
  const { reference, input } = await place();
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, true, send, OWNER);

  assert.deepEqual(
    sent.map(({ to, idempotencyKey }) => ({ to, idempotencyKey })),
    [{ to: input.email, idempotencyKey: `order-accepted/${reference}` }],
  );
});

test("with no owner address set, only the buyer is written to", async () => {
  const { reference } = await place();
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.equal(sent.length, 1);
});

test("with no API key the confirmation is recorded as skipped", async () => {
  const { reference } = await place();

  await sendPlacedEmails(reference, false);

  assert.equal(await statusOf(reference, "PLACED"), "SKIPPED");
});

test("a failed send is recorded as failed and does not throw", async () => {
  const { reference } = await place();
  const { send } = recorder("FAILED");

  await sendPlacedEmails(reference, false, send, OWNER);

  assert.equal(await statusOf(reference, "PLACED"), "FAILED");
});

async function step(reference: string, next: OrderStep, from: OrderStatus) {
  const { result, eventId } = await recordOrderStep(
    reference,
    next,
    from,
    new Date(),
    false,
    null,
  );
  if (!result.ok || eventId === null) throw new Error("step was refused");
  return eventId;
}

async function statusOfEvent(id: number) {
  const event = await prisma.orderEvent.findUniqueOrThrow({
    where: { id },
    select: { emailStatus: true },
  });
  return event.emailStatus;
}

test("an unknown order sends nothing and does not throw", async () => {
  const { sent, send } = recorder();

  await sendPlacedEmails("BP0101990", false, send, OWNER);
  await sendStepEmail("BP0101990", "send", 1, send);
  await sendWithdrawalEmails("BP0101990", send);

  assert.equal(sent.length, 0);
});

test("a send that throws is reported, not thrown, and records nothing", async () => {
  const { reference } = await place();
  let calls = 0;
  const failing = async () => {
    calls += 1;
    throw new Error("database gone");
  };

  await sendPlacedEmails(reference, false, failing, OWNER);

  assert.equal(calls, 1);
  assert.equal(await statusOf(reference, "PLACED"), null);
});

test("a replay never downgrades a confirmation already sent", async () => {
  const { reference } = await place();

  await sendPlacedEmails(reference, false, recorder("SENT").send, OWNER);
  await sendPlacedEmails(reference, true, recorder("FAILED").send, OWNER);

  assert.equal(await statusOf(reference, "PLACED"), "SENT");
});

test("marking an Econt order sent emails the buyer and records it on that step", async () => {
  const { reference, input } = await place();
  const eventId = await step(reference, "send", "new");
  const { sent, send } = recorder();

  await sendStepEmail(reference, "send", eventId, send);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, input.email);
  assert.equal(sent[0].message.subject, `Поръчка ${reference} е изпратена`);
  assert.equal(sent[0].idempotencyKey, `order-send/${eventId}`);
  assert.equal(await statusOfEvent(eventId), "SENT");
});

test("each send after an undo is its own email, recorded on its own step", async () => {
  const { reference } = await place();
  const { sent, send } = recorder();

  const first = await step(reference, "send", "new");
  await step(reference, "undo", "sent");
  const second = await step(reference, "send", "new");
  await sendStepEmail(reference, "send", first, send);
  await sendStepEmail(reference, "send", second, send);

  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    [`order-send/${first}`, `order-send/${second}`],
  );
  assert.equal(await statusOfEvent(first), "SENT");
  assert.equal(await statusOfEvent(second), "SENT");
});

test("cancelling an order emails the buyer and records it on that step", async () => {
  const { reference } = await place();
  const eventId = await step(reference, "cancel", "new");
  const { sent, send } = recorder();

  await sendStepEmail(reference, "cancel", eventId, send);

  assert.equal(sent[0].message.subject, `Поръчка ${reference} е анулирана`);
  assert.equal(await statusOfEvent(eventId), "SENT");
});

test("a step email naming another order's or another kind's event sends nothing", async () => {
  const { reference } = await place();
  const other = await place();
  const foreign = await step(other.reference, "send", "new");
  const own = await step(reference, "cancel", "new");
  const { sent, send } = recorder();

  await sendStepEmail(reference, "send", foreign, send);
  await sendStepEmail(reference, "send", own, send);

  assert.equal(sent.length, 0);
});

test("a withdrawal is acknowledged to the buyer and recorded on the withdrawal", async () => {
  const { reference, input } = await place();
  await applyOrderStep(reference, "send", "new");
  await withdrawFromOrder(
    {
      reference,
      name: "Иван Иванов",
      phone: input.phone,
      email: input.email,
    },
    null,
  );
  const { sent, send } = recorder();

  await sendWithdrawalEmails(reference, send);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, input.email);
  assert.equal(sent[0].idempotencyKey, `withdrawal/${reference}`);
  assert.ok(sent[0].message.text.includes("уговорим връщането на стоката"));
  assert.equal(await statusOf(reference, "WITHDRAWN"), "SENT");
});

test("a withdrawal also tells the owner, naming who withdrew and whether the order left", async () => {
  const { reference, input } = await place();
  await withdrawFromOrder(
    {
      reference,
      name: "Петър Петров",
      phone: input.phone,
      email: input.email,
    },
    null,
  );
  const { sent, send } = recorder();

  await sendWithdrawalEmails(reference, send, OWNER);

  assert.deepEqual(
    sent.map(({ to, idempotencyKey }) => ({ to, idempotencyKey })),
    [
      { to: input.email, idempotencyKey: `withdrawal/${reference}` },
      { to: OWNER, idempotencyKey: `owner-withdrawal/${reference}` },
    ],
  );
  assert.ok(sent[1].message.text.includes("Петър Петров"));
  assert.ok(sent[1].message.text.includes("не я изпращайте"));
});

test("an order never withdrawn gets no acknowledgement", async () => {
  const { reference } = await place();
  const { sent, send } = recorder();

  await sendWithdrawalEmails(reference, send);

  assert.equal(sent.length, 0);
});

async function edit(reference: string, overrides: Record<string, unknown>) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { reference },
    select: {
      contactName: true,
      contactPhone: true,
      customer: { select: { email: true } },
      deliveryMethod: true,
      officeCode: true,
      items: { orderBy: { id: "asc" }, select: { slug: true, quantity: true } },
    },
  });
  const original = {
    name: order.contactName,
    email: order.customer.email,
    phone: order.contactPhone,
    deliveryMethod: order.deliveryMethod,
    officeCode: order.officeCode ?? "",
    items: order.items,
  };
  const result = await editOrderContact({
    reference,
    original,
    ...original,
    ...overrides,
  });
  if (!result.ok || result.eventId === null) {
    throw new Error("edit was refused");
  }
  return result;
}

test("an edit emails the buyer the order as it now stands, without their name, and records it on the edit", async () => {
  const { reference } = await place({ name: "Петър Петров" });
  const email = `fixed-${randomUUID()}@example.com`;
  const { eventId } = await edit(reference, { email, phone: "0899111222" });
  const { sent, send } = recorder();

  await sendEditEmail(reference, eventId ?? 0, false, send);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, email);
  assert.equal(sent[0].message.subject, `Поръчка ${reference} е обновена`);
  assert.equal(sent[0].idempotencyKey, `order-edit/${eventId}`);
  assert.ok(sent[0].message.text.includes("+359899111222"));
  assert.ok(!sent[0].message.text.includes("Петър"));
  assert.ok(!sent[0].message.html.includes("Петър"));
  assert.equal(await statusOfEvent(eventId ?? 0), "SENT");
});

test("a failed edit email is recorded as failed on the edit", async () => {
  const { reference } = await place();
  const { eventId } = await edit(reference, { phone: "0899111222" });
  const { send } = recorder("FAILED");

  await sendEditEmail(reference, eventId ?? 0, false, send);

  assert.equal(await statusOfEvent(eventId ?? 0), "FAILED");
});

test("an order switched to Попово is emailed with hand delivery and no office", async () => {
  const { reference } = await place();
  const before = await prisma.order.findUniqueOrThrow({
    where: { reference },
    select: { officeName: true, officeStreet: true },
  });
  assert.ok(before.officeStreet);
  const { eventId } = await edit(reference, {
    deliveryMethod: "LOCAL",
    officeCode: "",
  });
  const { sent, send } = recorder();

  await sendEditEmail(reference, eventId ?? 0, false, send);

  const text = sent[0].message.text;
  assert.ok(text.includes(`гр. ${LOCAL_DELIVERY_CITY}`));
  assert.ok(text.includes("Доставка: Безплатна"));
  assert.ok(!text.includes(before.officeStreet));
});

test("a corrected email with offers ticked also sends the confirmation to the new address", async () => {
  const { reference } = await place({ acceptsOffers: true });
  const email = `fixed-${randomUUID()}@example.com`;
  const { eventId, offersUnconfirmed } = await edit(reference, { email });
  const consent = await prisma.consent.findFirstOrThrow({
    where: { order: { reference }, kind: "OFFERS" },
  });
  const { sent, send } = recorder();

  await sendEditEmail(reference, eventId ?? 0, offersUnconfirmed, send);

  assert.deepEqual(
    sent.map(({ to, idempotencyKey }) => ({ to, idempotencyKey })),
    [
      { to: email, idempotencyKey: `order-edit/${eventId}` },
      { to: email, idempotencyKey: `subscription-confirm/${consent.id}` },
    ],
  );
  assert.ok(sent[1].message.text.includes(`token=`));
});

test("no confirmation goes out unless asked for, or to an address already subscribed", async () => {
  const subscribed = `subscribed-${randomUUID()}@example.com`;
  const earlier = await place({ email: subscribed, acceptsOffers: true });
  await prisma.consent.updateMany({
    where: { order: { reference: earlier.reference }, kind: "OFFERS" },
    data: { confirmedAt: new Date() },
  });
  const unasked = await place({ acceptsOffers: true });
  const toSubscriber = await place({ acceptsOffers: true });
  const first = await edit(unasked.reference, {
    email: `fixed-${randomUUID()}@example.com`,
  });
  const second = await edit(toSubscriber.reference, { email: subscribed });
  const { sent, send } = recorder();

  await sendEditEmail(unasked.reference, first.eventId ?? 0, false, send);
  await sendEditEmail(
    toSubscriber.reference,
    second.eventId ?? 0,
    second.offersUnconfirmed,
    send,
  );

  assert.equal(second.offersUnconfirmed, true);
  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    [`order-edit/${first.eventId}`, `order-edit/${second.eventId}`],
  );
});

test("an edit email naming another order's or another kind's event sends nothing", async () => {
  const { reference } = await place();
  const other = await place();
  const foreign = await edit(other.reference, { name: "Петър Петров" });
  const cancel = await step(reference, "cancel", "new");
  const { sent, send } = recorder();

  await sendEditEmail(reference, foreign.eventId ?? 0, false, send);
  await sendEditEmail(reference, cancel, false, send);

  assert.equal(sent.length, 0);
});
