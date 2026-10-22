import assert from "node:assert/strict";
import { test } from "node:test";

import { EMAIL_DESIGNS } from "@/lib/email/layout";
import {
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  ownerNotificationEmail,
  withdrawalReceivedEmail,
} from "@/lib/email/templates";
import { type EmailClient, sendEmail } from "@/lib/email/transport";
import { formatPrice } from "@/lib/money";
import { OWNER_PHONE, SITE_URL } from "@/lib/site";

const OFFICE = { name: "Павликени", street: "пл. Стефан Караджа №16" };

const ORDER: OrderEmailData = {
  reference: "BP2210261",
  contactName: "Мария Иванова",
  contactPhone: "+359899777888",
  email: "maria.ivanova@example.com",
  items: [
    { name: "Пчелен прашец 500 г", quantity: 2, unitPriceCents: 1200 },
    { name: "Пчелен прашец 1 кг", quantity: 1, unitPriceCents: 2200 },
  ],
  deliveryCents: 590,
  totalCents: 5190,
  office: OFFICE,
};

const LOCAL_ORDER: OrderEmailData = {
  ...ORDER,
  office: null,
  deliveryCents: 0,
  totalCents: 4600,
};

const WITHDRAWAL = {
  reference: ORDER.reference,
  withdrawnAt: new Date("2026-10-22T07:30:00Z"),
  sent: false,
};

const ALL = [
  orderAcceptedEmail(ORDER),
  ownerNotificationEmail(ORDER),
  orderSentEmail({ ...ORDER, office: OFFICE }),
  orderCancelledEmail(ORDER),
  withdrawalReceivedEmail(WITHDRAWAL),
];

test("every email names its order in the subject, the HTML and the text", () => {
  for (const message of ALL) {
    assert.match(message.subject, /BP2210261/);
    assert.match(message.html, /BP2210261/);
    assert.match(message.text, /BP2210261/);
  }
});

test("every email to the buyer carries the owner's phone in both versions", () => {
  for (const message of [
    orderAcceptedEmail(ORDER),
    orderSentEmail({ ...ORDER, office: OFFICE }),
    orderCancelledEmail(ORDER),
    withdrawalReceivedEmail(WITHDRAWAL),
  ]) {
    assert.ok(message.html.includes(OWNER_PHONE.display));
    assert.ok(message.text.includes(OWNER_PHONE.display));
  }
});

test("the text version carries no markup", () => {
  for (const message of ALL) {
    assert.doesNotMatch(message.text, /<[a-z/!]/i);
  }
});

test("both designs draw the bee from the site and differ from each other", () => {
  const [a, b] = EMAIL_DESIGNS.map((design) =>
    orderAcceptedEmail(ORDER, design),
  );

  assert.ok(a.html.includes(`${SITE_URL}/email/bee.png`));
  assert.ok(b.html.includes(`${SITE_URL}/email/bee.png`));
  assert.notEqual(a.html, b.html);
  assert.equal(a.text, b.text);
  assert.equal(a.subject, b.subject);
});

test("the accepted email lists each line, the delivery and the total", () => {
  const { html, text } = orderAcceptedEmail(ORDER);

  for (const body of [html, text]) {
    assert.ok(body.includes("Пчелен прашец 500 г"));
    assert.ok(body.includes("Пчелен прашец 1 кг"));
    assert.ok(body.includes(formatPrice(2400)));
    assert.ok(body.includes(formatPrice(590)));
    assert.ok(body.includes(formatPrice(5190)));
    assert.ok(body.includes("Павликени, пл. Стефан Караджа №16"));
    assert.ok(body.includes("Плащате при получаване."));
    assert.ok(body.includes(`${SITE_URL}/withdraw`));
  }
});

test("an accepted order for Popovo promises a phone call and free delivery", () => {
  const { html, text } = orderAcceptedEmail(LOCAL_ORDER);

  for (const body of [html, text]) {
    assert.ok(body.includes("доставката в гр. Попово"));
    assert.ok(body.includes("Безплатна"));
    assert.ok(!body.includes("Еконт"));
  }
});

test("the owner's notification carries the buyer's contact and a link to the orders", () => {
  const { html, text } = ownerNotificationEmail(ORDER);

  for (const body of [html, text]) {
    assert.ok(body.includes("+359899777888"));
    assert.ok(body.includes("maria.ivanova@example.com"));
    assert.ok(body.includes(`${SITE_URL}/admin/orders`));
  }
  assert.ok(html.includes('href="tel:+359899777888"'));
  assert.ok(!html.includes(OWNER_PHONE.display));
  assert.ok(!text.includes(OWNER_PHONE.display));
});

test("the withdrawal email gives the Sofia time and says what happens next", () => {
  const unsent = withdrawalReceivedEmail(WITHDRAWAL);
  const sent = withdrawalReceivedEmail({ ...WITHDRAWAL, sent: true });

  assert.ok(unsent.text.includes("22.10.2026 г., 10:30"));
  assert.ok(unsent.text.includes("Поръчката няма да бъде изпратена."));
  assert.ok(sent.text.includes("уговорим връщането на стоката"));
  assert.ok(!sent.text.includes("Поръчката няма да бъде изпратена."));
});

test("the sent email names the office and the sum to pay on collection", () => {
  const { text } = orderSentEmail({ ...ORDER, office: OFFICE });

  assert.ok(text.includes("Павликени, пл. Стефан Караджа №16"));
  assert.ok(text.includes(`При получаване платете ${formatPrice(5190)}.`));
});

test("no field of any email can inject markup, in either design", () => {
  const hostile = `"'><img src=x onerror=alert(1)>`;
  const office = { name: hostile, street: hostile };
  const order: OrderEmailData = {
    ...ORDER,
    reference: hostile,
    contactName: hostile,
    contactPhone: hostile,
    email: hostile,
    items: [{ name: hostile, quantity: 1, unitPriceCents: 100 }],
    office,
  };

  for (const design of EMAIL_DESIGNS) {
    for (const { html } of [
      orderAcceptedEmail(order, design),
      orderAcceptedEmail({ ...order, office: null }, design),
      ownerNotificationEmail(order, design),
      ownerNotificationEmail({ ...order, office: null }, design),
      orderSentEmail({ ...order, office }, design),
      orderCancelledEmail(order, design),
      withdrawalReceivedEmail({ ...WITHDRAWAL, reference: hostile }, design),
    ]) {
      assert.ok(!html.includes("<img src=x"), html);
      assert.ok(!html.includes(`"'>`));
    }
  }
});

test("emails to the buyer do not repeat the name the buyer typed", () => {
  const named = { ...ORDER, contactName: "Посетете evil.example" };

  for (const message of [
    orderAcceptedEmail(named),
    orderSentEmail({ ...named, office: OFFICE }),
    orderCancelledEmail(named),
  ]) {
    assert.ok(!message.html.includes("evil.example"));
    assert.ok(!message.text.includes("evil.example"));
  }
});

function fakeClient(answer: () => Promise<unknown>) {
  const calls: { payload: Record<string, unknown>; options: unknown }[] = [];
  const client = {
    emails: {
      send: (payload: Record<string, unknown>, options: unknown) => {
        calls.push({ payload, options });
        return answer();
      },
    },
  } as unknown as EmailClient;

  return { client, calls };
}

const OUTGOING = {
  to: ORDER.email,
  message: orderAcceptedEmail(ORDER),
  idempotencyKey: "order-accepted/BP2210261",
};

const ENV = { RESEND_API_KEY: "re_test", EMAIL_REPLY_TO: "owner@example.com" };

test("with no API key the email is skipped and nothing is sent", async () => {
  assert.equal(await sendEmail(OUTGOING, {}), "SKIPPED");
});

test("a send carries the sender, reply-to, both versions and the idempotency key", async () => {
  const { client, calls } = fakeClient(async () => ({
    data: { id: "1" },
    error: null,
  }));

  assert.equal(await sendEmail(OUTGOING, ENV, client), "SENT");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.to, ORDER.email);
  assert.equal(calls[0].payload.replyTo, "owner@example.com");
  assert.match(String(calls[0].payload.from), /onboarding@resend\.dev/);
  assert.equal(calls[0].payload.subject, OUTGOING.message.subject);
  assert.equal(calls[0].payload.html, OUTGOING.message.html);
  assert.equal(calls[0].payload.text, OUTGOING.message.text);
  assert.deepEqual(calls[0].options, {
    idempotencyKey: "order-accepted/BP2210261",
  });
});

test("a configured sender replaces the test sender", async () => {
  const { client, calls } = fakeClient(async () => ({
    data: { id: "1" },
    error: null,
  }));

  await sendEmail(
    OUTGOING,
    { ...ENV, EMAIL_FROM: "Поръчки <orders@example.com>" },
    client,
  );

  assert.equal(calls[0].payload.from, "Поръчки <orders@example.com>");
});

test("an error Resend answers with, rather than throws, is a failed send", async () => {
  const { client } = fakeClient(async () => ({
    data: null,
    error: { name: "validation_error", message: "domain not verified" },
  }));

  assert.equal(await sendEmail(OUTGOING, ENV, client), "FAILED");
});

test("a send that throws is a failed send, not a crash", async () => {
  const { client } = fakeClient(async () => {
    throw new Error("network down");
  });

  assert.equal(await sendEmail(OUTGOING, ENV, client), "FAILED");
});

test("a key with no reply-to address fails without sending", async () => {
  const { client, calls } = fakeClient(async () => ({
    data: { id: "1" },
    error: null,
  }));

  assert.equal(
    await sendEmail(OUTGOING, { RESEND_API_KEY: "re_test" }, client),
    "FAILED",
  );
  assert.equal(calls.length, 0);
});
