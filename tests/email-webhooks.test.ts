import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { after, test } from "node:test";

import type { EmailBouncedEvent, EmailComplainedEvent } from "resend";

import { POST } from "@/app/api/webhooks/resend/route";
import {
  handleEmailEvent,
  MAX_WEBHOOK_BYTES,
  readWebhookEvent,
} from "@/lib/email-webhooks";
import { sendPlacedEmails } from "@/lib/order-emails";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const WEBHOOK_URL = "http://localhost/api/webhooks/resend";
const KEY = randomBytes(24);
const ENV = {
  RESEND_API_KEY: "re_test",
  RESEND_WEBHOOK_SECRET: `whsec_${KEY.toString("base64")}`,
};

function signed(
  payload: string,
  {
    key = KEY,
    timestamp = Math.floor(Date.now() / 1000),
  }: { key?: Buffer; timestamp?: number } = {},
) {
  const id = `msg_${randomUUID()}`;
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": String(timestamp),
    "svix-signature": `v1,${signature}`,
  });
}

function post(body: BodyInit, headers: Headers = new Headers()) {
  return new Request(WEBHOOK_URL, {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit);
}

function emailData(to: string[]) {
  const now = new Date().toISOString();
  return {
    created_at: now,
    email_id: randomUUID(),
    message_id: `<${randomUUID()}@example.com>`,
    from: "Пчелни продукти <info@example.com>",
    to,
    subject: "Поръчка",
  };
}

function bounced(emailId: string): EmailBouncedEvent {
  return {
    type: "email.bounced",
    created_at: new Date().toISOString(),
    data: {
      ...emailData(["someone@example.com"]),
      email_id: emailId,
      bounce: { type: "Permanent", subType: "General", message: "gone" },
    },
  };
}

function complained(to: string[]): EmailComplainedEvent {
  return {
    type: "email.complained",
    created_at: new Date().toISOString(),
    data: emailData(to),
  };
}

async function place(overrides: Record<string, unknown> = {}) {
  const input = validCheckoutInput(overrides);
  const result = await placeOrder(input, null);
  if (!result.ok) throw new Error("order was refused");
  return { reference: result.order.reference, email: input.email as string };
}

async function placeAndMail(overrides: Record<string, unknown> = {}) {
  const placed = await place(overrides);
  const resendEmailId = randomUUID();
  await sendPlacedEmails(
    placed.reference,
    false,
    async () => ({ status: "SENT", resendEmailId }),
    undefined,
  );
  return { ...placed, resendEmailId };
}

async function placedStatus(reference: string) {
  const event = await prisma.orderEvent.findFirstOrThrow({
    where: { order: { reference }, kind: "PLACED" },
    select: { emailStatus: true, resendEmailId: true },
  });
  return event;
}

async function offersWithdrawnAt(reference: string) {
  const consent = await prisma.consent.findFirstOrThrow({
    where: { order: { reference }, kind: "OFFERS" },
    select: { withdrawnAt: true },
  });
  return consent.withdrawnAt;
}

async function offersWithdrawn(reference: string) {
  return (await offersWithdrawnAt(reference)) !== null;
}

test("a correctly signed webhook is read as its event", async () => {
  const payload = JSON.stringify(bounced("e1"));
  const event = await readWebhookEvent(post(payload, signed(payload)), ENV);
  assert.equal(event?.type, "email.bounced");
});

test("a webhook whose body was changed after signing is refused", async () => {
  const payload = JSON.stringify(bounced("e1"));
  const headers = signed(payload);
  assert.equal(
    await readWebhookEvent(post(JSON.stringify(bounced("e2")), headers), ENV),
    null,
  );
});

test("a webhook signed with another secret is refused", async () => {
  const payload = JSON.stringify(bounced("e1"));
  const headers = signed(payload, { key: randomBytes(24) });
  assert.equal(await readWebhookEvent(post(payload, headers), ENV), null);
});

test("a webhook signed long ago is refused, so a captured one cannot be replayed", async () => {
  const payload = JSON.stringify(bounced("e1"));
  const timestamp = Math.floor(Date.now() / 1000) - 10 * 60;
  const headers = signed(payload, { timestamp });
  assert.equal(await readWebhookEvent(post(payload, headers), ENV), null);
});

test("a correctly signed body over the size limit is refused", async () => {
  const event = bounced("e1");
  const payload = JSON.stringify({
    ...event,
    data: { ...event.data, subject: "x".repeat(MAX_WEBHOOK_BYTES) },
  });
  assert.equal(
    await readWebhookEvent(post(payload, signed(payload)), ENV),
    null,
  );
});

test("a call with no signature headers is refused before its body is read", async () => {
  let pulled = false;
  const body = new ReadableStream(
    {
      pull(controller) {
        pulled = true;
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  assert.equal(await readWebhookEvent(post(body), ENV), null);
  assert.equal(pulled, false);
});

test("with no webhook secret or no API key every webhook is refused", async () => {
  const payload = JSON.stringify(bounced("e1"));
  assert.equal(
    await readWebhookEvent(post(payload, signed(payload)), {
      RESEND_API_KEY: ENV.RESEND_API_KEY,
    }),
    null,
  );
  assert.equal(
    await readWebhookEvent(post(payload, signed(payload)), {
      RESEND_WEBHOOK_SECRET: ENV.RESEND_WEBHOOK_SECRET,
    }),
    null,
  );
});

test("the order's email event keeps Resend's id for that email", async () => {
  const { reference, resendEmailId } = await placeAndMail();
  assert.deepEqual(await placedStatus(reference), {
    emailStatus: "SENT",
    resendEmailId,
  });
});

test("a bounce marks the event of that email, and no other, as not delivered", async () => {
  const bouncedOrder = await placeAndMail();
  const other = await placeAndMail();

  await handleEmailEvent(bounced(bouncedOrder.resendEmailId));

  assert.equal(
    (await placedStatus(bouncedOrder.reference)).emailStatus,
    "BOUNCED",
  );
  assert.equal((await placedStatus(other.reference)).emailStatus, "SENT");
});

test("a bounce for an email no event holds changes nothing", async () => {
  const { reference } = await placeAndMail();
  await handleEmailEvent(bounced(randomUUID()));
  assert.equal((await placedStatus(reference)).emailStatus, "SENT");
});

test("a bounce that names no email changes nothing", async () => {
  const { reference } = await placeAndMail();
  const event = bounced("e1");
  await handleEmailEvent({
    ...event,
    data: { ...event.data, email_id: undefined as unknown as string },
  });
  assert.equal((await placedStatus(reference)).emailStatus, "SENT");
});

test("a replayed order does not turn a bounced confirmation back into sent", async () => {
  const { reference, resendEmailId } = await placeAndMail();
  await handleEmailEvent(bounced(resendEmailId));

  await sendPlacedEmails(
    reference,
    true,
    async () => ({ status: "SENT", resendEmailId }),
    undefined,
  );

  assert.equal((await placedStatus(reference)).emailStatus, "BOUNCED");
});

test("a spam complaint unsubscribes the customer with that address, whatever its case", async () => {
  const complainer = await place({ acceptsOffers: true });
  const other = await place({ acceptsOffers: true });

  await handleEmailEvent(complained([`  ${complainer.email.toUpperCase()} `]));

  assert.equal(await offersWithdrawn(complainer.reference), true);
  assert.equal(await offersWithdrawn(other.reference), false);
});

test("a spam complaint keeps the date of an earlier unsubscribe", async () => {
  const { reference, email } = await place({ acceptsOffers: true });
  const unsubscribedAt = new Date("2026-10-01T08:00:00Z");
  await prisma.consent.updateMany({
    where: { order: { reference }, kind: "OFFERS" },
    data: { withdrawnAt: unsubscribedAt },
  });

  await handleEmailEvent(complained([email]), new Date("2026-11-01T08:00:00Z"));

  assert.deepEqual(await offersWithdrawnAt(reference), unsubscribedAt);
});

test("the webhook route refuses an unsigned call and acts on a signed one", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, ENV);
  try {
    const { reference, resendEmailId } = await placeAndMail();
    const payload = JSON.stringify(bounced(resendEmailId));

    const unsigned = await POST(post(payload));
    assert.equal(unsigned.status, 401);
    assert.equal((await placedStatus(reference)).emailStatus, "SENT");

    const accepted = await POST(post(payload, signed(payload)));
    assert.equal(accepted.status, 204);
    assert.equal((await placedStatus(reference)).emailStatus, "BOUNCED");
  } finally {
    process.env.RESEND_API_KEY = saved.RESEND_API_KEY;
    process.env.RESEND_WEBHOOK_SECRET = saved.RESEND_WEBHOOK_SECRET;
    if (saved.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    if (saved.RESEND_WEBHOOK_SECRET === undefined)
      delete process.env.RESEND_WEBHOOK_SECRET;
  }
});
