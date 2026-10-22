import assert from "node:assert/strict";
import { after, test } from "node:test";

import { POST } from "@/app/api/unsubscribe/route";
import type { EmailStatus } from "@/generated/prisma/enums";
import { readEmailToken, signEmailToken } from "@/lib/email-token";
import type { Outgoing } from "@/lib/email/transport";
import { sendPlacedEmails } from "@/lib/order-emails";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import {
  confirmSubscription,
  isSubscribed,
  unsubscribe,
} from "@/lib/subscriptions";

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

async function subscribedBuyer() {
  const placed = await place({ acceptsOffers: true });
  if (placed.offersId === null) throw new Error("no offers consent");
  await confirmSubscription(signEmailToken("confirm", placed.offersId));
  return placed;
}

function tokenIn(text: string, path: string) {
  const match = new RegExp(`${path}\\?token=([^\\s>]+)`).exec(text);
  if (!match) throw new Error(`no ${path} link`);
  return match[1];
}

test("a signed token reads back as its id", () => {
  assert.equal(
    readEmailToken(signEmailToken("confirm", 42, SECRET), "confirm", SECRET),
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

test("a confirmation token does not work as an unsubscribe token", () => {
  const token = signEmailToken("confirm", 7, SECRET);
  const relabelled = token.replace(/^confirm/, "unsubscribe");

  assert.equal(readEmailToken(token, "unsubscribe", SECRET), null);
  assert.equal(readEmailToken(relabelled, "unsubscribe", SECRET), null);
});

test("a token signed with another secret is refused", () => {
  const token = signEmailToken("confirm", 7, {
    EMAIL_TOKEN_SECRET: "b".repeat(32),
  });

  assert.equal(readEmailToken(token, "confirm", SECRET), null);
});

test("malformed tokens are refused", () => {
  for (const token of ["", "confirm", "confirm.7", "confirm.0.x", "x.y.z"]) {
    assert.equal(readEmailToken(token, "confirm", SECRET), null);
  }
});

test("signing refuses a missing or short secret", () => {
  assert.throws(() => signEmailToken("confirm", 1, {}));
  assert.throws(() =>
    signEmailToken("confirm", 1, { EMAIL_TOKEN_SECRET: "short" }),
  );
});

test("a ticked box is not a subscription until it is confirmed", async () => {
  const { customerId, offersId } = await place({ acceptsOffers: true });
  assert.notEqual(offersId, null);

  assert.equal(await isSubscribed(customerId), false);
});

test("confirming sets the time once, and a second confirm keeps it", async () => {
  const { customerId, offersId } = await place({ acceptsOffers: true });
  const token = signEmailToken("confirm", offersId!);
  const first = new Date("2026-10-22T08:00:00Z");

  assert.equal(await confirmSubscription(token, first), "confirmed");
  assert.equal(
    await confirmSubscription(token, new Date("2026-10-23T08:00:00Z")),
    "confirmed",
  );

  const consent = await prisma.consent.findUniqueOrThrow({
    where: { id: offersId! },
  });
  assert.deepEqual(consent.confirmedAt, first);
  assert.equal(await isSubscribed(customerId), true);
});

test("a forged confirmation token confirms nothing", async () => {
  const { offersId } = await place({ acceptsOffers: true });
  const forged = signEmailToken("confirm", offersId!, SECRET);

  assert.equal(await confirmSubscription(forged), "invalid");
  const consent = await prisma.consent.findUniqueOrThrow({
    where: { id: offersId! },
  });
  assert.equal(consent.confirmedAt, null);
});

test("a confirmation link opened after unsubscribing does not resubscribe", async () => {
  const { customerId, offersId } = await place({ acceptsOffers: true });

  await unsubscribe(signEmailToken("unsubscribe", customerId));

  assert.equal(
    await confirmSubscription(signEmailToken("confirm", offersId!)),
    "invalid",
  );
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

test("a new buyer who ticks offers is sent a confirmation link for that consent", async () => {
  const { reference, email, offersId } = await place({ acceptsOffers: true });
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.deepEqual(
    sent.map(({ to, idempotencyKey }) => ({ to, idempotencyKey })),
    [
      { to: email, idempotencyKey: `order-accepted/${reference}` },
      { to: email, idempotencyKey: `subscription-confirm/${offersId}` },
    ],
  );
  assert.equal(
    readEmailToken(
      tokenIn(sent[1].message.text, "/subscription/confirm"),
      "confirm",
    ),
    offersId,
  );
  assert.equal(sent[0].headers, undefined);
  assert.doesNotMatch(sent[0].message.text, /Абонирани сте/);
});

test("a buyer who leaves offers unticked is sent no confirmation", async () => {
  const { reference } = await place();
  const { sent, send } = recorder();

  await sendPlacedEmails(reference, false, send, undefined);

  assert.equal(sent.length, 1);
});

for (const acceptsOffers of [true, false]) {
  test(`a confirmed subscriber's next order (offers ${acceptsOffers ? "ticked" : "unticked"}) says so, with an unsubscribe link and no new confirmation`, async () => {
    const buyer = await subscribedBuyer();
    const { reference } = await place({ email: buyer.email, acceptsOffers });
    const { sent, send } = recorder();

    await sendPlacedEmails(reference, false, send, undefined);

    assert.equal(sent.length, 1);
    const [accepted] = sent;
    assert.match(accepted.message.text, /Абонирани сте/);
    assert.match(accepted.message.html, /Абонирани сте/);
    assert.equal(
      readEmailToken(
        tokenIn(accepted.message.text, "/subscription/unsubscribe"),
        "unsubscribe",
      ),
      buyer.customerId,
    );
    assert.equal(
      accepted.headers?.["List-Unsubscribe-Post"],
      "List-Unsubscribe=One-Click",
    );
    assert.equal(
      readEmailToken(
        tokenIn(
          accepted.headers?.["List-Unsubscribe"] ?? "",
          "/api/unsubscribe",
        ),
        "unsubscribe",
      ),
      buyer.customerId,
    );
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

test("a buyer who unsubscribed and ticks offers again is asked to confirm, and confirming resubscribes", async () => {
  const buyer = await subscribedBuyer();
  await unsubscribe(signEmailToken("unsubscribe", buyer.customerId));
  const again = await place({ email: buyer.email, acceptsOffers: true });
  const { sent, send } = recorder();

  await sendPlacedEmails(again.reference, false, send, undefined);

  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    [
      `order-accepted/${again.reference}`,
      `subscription-confirm/${again.offersId}`,
    ],
  );
  const token = tokenIn(sent[1].message.text, "/subscription/confirm");
  assert.equal(await confirmSubscription(token), "confirmed");
  assert.equal(await isSubscribed(buyer.customerId), true);
});
