import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, test } from "node:test";

import { POST } from "@/app/api/unsubscribe/route";
import type { EmailStatus } from "@/generated/prisma/enums";
import { readEmailToken, signEmailToken } from "@/lib/email-token";
import type { Outgoing } from "@/lib/email/transport";
import { sendPlacedEmails } from "@/lib/order-emails";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { isSubscribed, unsubscribe } from "@/lib/subscriptions";

import { validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const SECRET = { EMAIL_TOKEN_SECRET: "a".repeat(32) };

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
  const order = await prisma.order.findUniqueOrThrow({
    where: { reference: result.order.reference },
    select: {
      customerId: true,
      consents: { where: { kind: "OFFERS" }, select: { id: true } },
    },
  });
  return {
    reference: result.order.reference,
    email: input.email as string,
    customerId: order.customerId,
    offersId: order.consents[0]?.id ?? null,
  };
}

function subscribedBuyer() {
  return place({ acceptsOffers: true });
}

function tokenIn(text: string, path: string) {
  const match = new RegExp(`${path}\\?token=([^\\s>]+)`).exec(text);
  if (!match) throw new Error(`no ${path} link`);
  return match[1];
}

function assertSubscribedEmail(accepted: Outgoing, customerId: number) {
  assert.match(accepted.message.text, /Абонирани сте/);
  assert.match(accepted.message.html, /Абонирани сте/);
  assert.equal(
    readEmailToken(
      tokenIn(accepted.message.text, "/subscription/unsubscribe"),
      "unsubscribe",
    ),
    customerId,
  );
  assert.equal(
    accepted.headers?.["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click",
  );
  assert.equal(
    readEmailToken(
      tokenIn(accepted.headers?.["List-Unsubscribe"] ?? "", "/api/unsubscribe"),
      "unsubscribe",
    ),
    customerId,
  );
}

test("a signed token reads back as its id", () => {
  assert.equal(
    readEmailToken(
      signEmailToken("unsubscribe", 42, SECRET),
      "unsubscribe",
      SECRET,
    ),
    42,
  );
});

test("a token with a changed id or signature is refused", () => {
  const token = signEmailToken("unsubscribe", 7, SECRET);
  const [purpose, , signature] = token.split(".");
  const flipped = `${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;

  assert.equal(
    readEmailToken(`${purpose}.8.${signature}`, "unsubscribe", SECRET),
    null,
  );
  assert.equal(
    readEmailToken(`${purpose}.7.${flipped}`, "unsubscribe", SECRET),
    null,
  );
});

test("a token in another purpose's format is refused", () => {
  const token = signEmailToken("unsubscribe", 7, SECRET);
  const relabelled = token.replace(/^unsubscribe/, "confirm");

  assert.equal(readEmailToken(relabelled, "unsubscribe", SECRET), null);
});

test("the purpose is part of what is signed, so a signature over the id alone is refused", () => {
  const idOnly = createHmac("sha256", SECRET.EMAIL_TOKEN_SECRET)
    .update("7")
    .digest("base64url");

  assert.equal(
    readEmailToken(`unsubscribe.7.${idOnly}`, "unsubscribe", SECRET),
    null,
  );
});

test("a token signed with another secret is refused", () => {
  const token = signEmailToken("unsubscribe", 7, {
    EMAIL_TOKEN_SECRET: "b".repeat(32),
  });

  assert.equal(readEmailToken(token, "unsubscribe", SECRET), null);
});

test("malformed tokens are refused", () => {
  for (const token of [
    "",
    "unsubscribe",
    "unsubscribe.7",
    "unsubscribe.0.x",
    "x.y.z",
  ]) {
    assert.equal(readEmailToken(token, "unsubscribe", SECRET), null);
  }
});

test("signing refuses a missing or short secret", () => {
  assert.throws(() => signEmailToken("unsubscribe", 1, {}));
  assert.throws(() =>
    signEmailToken("unsubscribe", 1, { EMAIL_TOKEN_SECRET: "short" }),
  );
});

test("a ticked box makes the buyer a subscriber at once", async () => {
  const { customerId, offersId } = await place({ acceptsOffers: true });
  assert.notEqual(offersId, null);

  assert.equal(await isSubscribed(customerId), true);
});

test("an unticked box subscribes no one", async () => {
  const { customerId, offersId } = await place();
  assert.equal(offersId, null);

  assert.equal(await isSubscribed(customerId), false);
});

test("unsubscribing withdraws every offers consent of that buyer and no one else's", async () => {
  const buyer = await subscribedBuyer();
  const second = await place({ email: buyer.email, acceptsOffers: true });
  const other = await subscribedBuyer();
  const at = new Date("2026-10-22T09:00:00Z");

  assert.equal(
    await unsubscribe(signEmailToken("unsubscribe", buyer.customerId), at),
    "unsubscribed",
  );

  const withdrawn = await prisma.consent.findMany({
    where: { id: { in: [buyer.offersId!, second.offersId!] } },
    select: { withdrawnAt: true },
  });
  assert.deepEqual(
    withdrawn.map((consent) => consent.withdrawnAt),
    [at, at],
  );
  assert.equal(await isSubscribed(buyer.customerId), false);
  assert.equal(await isSubscribed(other.customerId), true);
});

test("a forged unsubscribe token withdraws nothing", async () => {
  const buyer = await subscribedBuyer();

  assert.equal(
    await unsubscribe(signEmailToken("unsubscribe", buyer.customerId, SECRET)),
    "invalid",
  );
  assert.equal(await isSubscribed(buyer.customerId), true);
});

test("the one-click endpoint unsubscribes from the token in its URL", async () => {
  const buyer = await subscribedBuyer();
  const token = signEmailToken("unsubscribe", buyer.customerId);

  const response = await POST(
    new Request(`http://localhost/api/unsubscribe?token=${token}`, {
      method: "POST",
      body: "List-Unsubscribe=One-Click",
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(await isSubscribed(buyer.customerId), false);
});

test("a new buyer who ticks offers gets one email, which already says they are subscribed", async () => {
  const { reference, customerId } = await place({ acceptsOffers: true });
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    [`order-accepted/${reference}`],
  );
  assertSubscribedEmail(sent[0], customerId);
});

test("a buyer who leaves offers unticked gets an email that says nothing about a subscription", async () => {
  const { reference } = await place();
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].headers, undefined);
  assert.doesNotMatch(sent[0].message.text, /Абонирани сте/);
});

for (const acceptsOffers of [true, false]) {
  test(`a subscriber's next order (offers ${acceptsOffers ? "ticked" : "unticked"}) says so, with an unsubscribe link`, async () => {
    const buyer = await subscribedBuyer();
    const { reference } = await place({ email: buyer.email, acceptsOffers });
    const { sent, send } = recorder();

    await sendPlacedEmails(reference, false, send, undefined);

    assert.equal(sent.length, 1);
    assertSubscribedEmail(sent[0], buyer.customerId);
  });
}

test("an unsubscribed buyer's next order says nothing about a subscription", async () => {
  const buyer = await subscribedBuyer();
  await unsubscribe(signEmailToken("unsubscribe", buyer.customerId));
  const { reference } = await place({ email: buyer.email });
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.equal(sent.length, 1);
  assert.doesNotMatch(sent[0].message.text, /Абонирани сте/);
  assert.equal(sent[0].headers, undefined);
});

test("without a token secret the order email still goes out, without the link", async () => {
  const buyer = await subscribedBuyer();
  const { reference } = await place({ email: buyer.email });
  const { sent, send } = recorder();
  const secret = process.env.EMAIL_TOKEN_SECRET;
  const logged = console.error;
  delete process.env.EMAIL_TOKEN_SECRET;
  console.error = () => {};

  try {
    await sendPlacedEmails(reference, false, send, undefined);
  } finally {
    process.env.EMAIL_TOKEN_SECRET = secret;
    console.error = logged;
  }

  assert.equal(sent.length, 1);
  assert.equal(sent[0].idempotencyKey, `order-accepted/${reference}`);
  assert.doesNotMatch(sent[0].message.text, /Абонирани сте/);
});

test("reading a token with no secret set refuses it instead of throwing", () => {
  const token = signEmailToken("unsubscribe", 7, SECRET);
  const logged = console.error;
  console.error = () => {};

  try {
    assert.equal(readEmailToken(token, "unsubscribe", {}), null);
  } finally {
    console.error = logged;
  }
});

test("a buyer who unsubscribed and ticks offers again is subscribed again by that order", async () => {
  const buyer = await subscribedBuyer();
  await unsubscribe(signEmailToken("unsubscribe", buyer.customerId));
  const again = await place({ email: buyer.email, acceptsOffers: true });
  const { sent, send } = recorder();

  assert.equal(await isSubscribed(buyer.customerId), true);

  await sendPlacedEmails(again.reference, false, send, undefined);

  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    [`order-accepted/${again.reference}`],
  );
  assertSubscribedEmail(sent[0], buyer.customerId);
});
