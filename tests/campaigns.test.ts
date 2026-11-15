import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { createCampaign, sendCampaignBatch } from "@/lib/campaigns";
import { eraseCustomer } from "@/lib/customer-erasure";
import type { Outgoing, Sent } from "@/lib/email/transport";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { unsubscribeHeaders } from "@/lib/subscriptions";

import { validCheckoutInput } from "./support/checkout";

const ADMIN = "admin@example.com";
const NOW = new Date("2031-01-01T12:00:00Z");
const TODAY = "2031-01-01";
const MESSAGE = { subject: "Оферта", html: "<p>Оферта</p>", text: "Оферта" };
const campaigns: number[] = [];
const promotions: number[] = [];

process.env.EMAIL_TOKEN_SECRET ??= "a".repeat(32);

after(async () => {
  await prisma.campaign.deleteMany({ where: { id: { in: campaigns } } });
  await prisma.promotion.deleteMany({ where: { id: { in: promotions } } });
  await prisma.emailSend.deleteMany({
    where: { createdAt: { gte: new Date("2030-12-30T00:00:00Z") } },
  });
  await prisma.$disconnect();
});

async function buyer(lastOrders: string[], acceptsOffers = true) {
  const input = validCheckoutInput({ acceptsOffers });
  let customerId = 0;
  for (const [index, day] of lastOrders.entries()) {
    const result = await placeOrder(
      {
        ...input,
        acceptsOffers: acceptsOffers && index === 0,
        idempotencyKey: randomUUID(),
      },
      null,
    );
    if (!result.ok) throw new Error("order was refused");
    const order = await prisma.order.update({
      where: { reference: result.order.reference },
      data: { createdAt: new Date(`${day}T10:00:00Z`) },
      select: { customerId: true },
    });
    customerId = order.customerId;
  }
  return { customerId, email: input.email as string };
}

async function product500g() {
  return prisma.product.findUniqueOrThrow({
    where: { slug: "pchelen-prashets-500g" },
    select: { id: true },
  });
}

async function restock(productIds: number[] = []) {
  const result = await createCampaign(
    { kind: "RESTOCK", text: "Ново зареждане", productIds },
    ADMIN,
    NOW,
  );
  if (!result.ok) throw new Error(JSON.stringify(result));
  campaigns.push(result.id);
  return result;
}

async function recipients(campaignId: number) {
  return prisma.campaignRecipient.findMany({
    where: { campaignId },
    orderBy: { id: "asc" },
    select: {
      customerId: true,
      status: true,
      sentAt: true,
      resendEmailId: true,
    },
  });
}

function recorder(status: Sent["status"] = "SENT") {
  const sent: Outgoing[] = [];
  const send = async (outgoing: Outgoing): Promise<Sent> => {
    sent.push(outgoing);
    return {
      status,
      resendEmailId: status === "SENT" ? randomUUID() : null,
    };
  };
  return { sent, send };
}

async function usedToday(count: number) {
  await prisma.emailSend.deleteMany({
    where: { createdAt: { gte: new Date("2030-12-30T00:00:00Z") } },
  });
  await prisma.emailSend.createMany({
    data: Array.from({ length: count }, () => ({
      status: "SENT" as const,
      createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    })),
  });
}

test("a campaign is addressed to every subscriber, the longest since their last order first", async () => {
  const march = await buyer(["2026-03-01"]);
  const january = await buyer(["2026-01-01"]);
  const recentAgain = await buyer(["2025-12-01", "2026-04-01"]);
  const february = await buyer(["2026-02-01"]);
  const notSubscribed = await buyer(["2025-01-01"], false);
  const withdrawn = await buyer(["2025-01-02"]);
  await prisma.consent.updateMany({
    where: { order: { customerId: withdrawn.customerId } },
    data: { withdrawnAt: NOW },
  });
  const product = await product500g();

  const result = await restock([product.id]);

  const order = (await recipients(result.id)).map(
    ({ customerId }) => customerId,
  );
  assert.equal(result.recipients, order.length);
  assert.deepEqual(
    order.filter((id) =>
      [march, january, recentAgain, february, notSubscribed, withdrawn]
        .map(({ customerId }) => customerId)
        .includes(id),
    ),
    [january, february, march, recentAgain].map(({ customerId }) => customerId),
  );
  const stored = await prisma.campaign.findUniqueOrThrow({
    where: { id: result.id },
    select: {
      kind: true,
      text: true,
      createdBy: true,
      products: { select: { productId: true, sortOrder: true } },
    },
  });
  assert.deepEqual(stored, {
    kind: "RESTOCK",
    text: "Ново зареждане",
    createdBy: ADMIN,
    products: [{ productId: product.id, sortOrder: 0 }],
  });
});

test("a promotion campaign needs a promotion running that day", async () => {
  await buyer(["2026-01-01"]);
  const product = await product500g();
  const promotion = (startsOn: string, endsOn: string, endedAt?: Date) =>
    prisma.promotion.create({
      data: {
        productId: product.id,
        kind: "PERCENT",
        value: 10,
        startsOn,
        endsOn,
        endedAt,
        createdBy: ADMIN,
      },
    });
  const running = await promotion(TODAY, TODAY);
  const upcoming = await promotion("2031-01-02", "2031-01-05");
  const ended = await promotion(TODAY, TODAY, NOW);
  promotions.push(running.id, upcoming.id, ended.id);

  for (const { id } of [upcoming, ended]) {
    assert.deepEqual(
      await createCampaign(
        { kind: "PROMOTION", text: "Промоция", promotionId: id },
        ADMIN,
        NOW,
      ),
      { ok: false, code: "PROMOTION_NOT_RUNNING" },
    );
  }
  const result = await createCampaign(
    { kind: "PROMOTION", text: "Промоция", promotionId: running.id },
    ADMIN,
    NOW,
  );
  assert.equal(result.ok, true);
  if (result.ok) campaigns.push(result.id);
});

test("a crafted campaign, or one naming a product that is not on sale, is refused", async () => {
  const product = await product500g();
  const draft = await prisma.product.findFirstOrThrow({
    where: { isPublished: false },
    select: { id: true },
  });
  const restockOf = (overrides: Record<string, unknown>) => ({
    kind: "RESTOCK",
    text: "Ново зареждане",
    productIds: [],
    ...overrides,
  });

  for (const crafted of [
    restockOf({ text: "   " }),
    restockOf({ text: "а".repeat(2001) }),
    restockOf({ productIds: [product.id, product.id] }),
    restockOf({ productIds: [1, 2, 3, 4, 5] }),
    restockOf({ kind: "NEWS" }),
    { kind: "PROMOTION", text: "Промоция" },
    null,
  ]) {
    assert.deepEqual(
      await createCampaign(crafted, ADMIN, NOW),
      { ok: false, code: "INVALID_INPUT" },
      JSON.stringify(crafted),
    );
  }
  assert.deepEqual(
    await createCampaign(restockOf({ productIds: [draft.id] }), ADMIN, NOW),
    { ok: false, code: "UNKNOWN_PRODUCT" },
  );
});

test("one batch sends only what the day's limit leaves, in order, each keyed and with unsubscribe headers", async () => {
  await buyer(["2026-01-01"]);
  await buyer(["2026-01-02"]);
  await buyer(["2026-01-03"]);
  const campaign = await restock();
  await usedToday(78);
  const { sent, send } = recorder();

  const batch = await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send,
  });

  const rows = await recipients(campaign.id);
  const first = rows.slice(0, 2);
  assert.deepEqual(batch, {
    sent: 2,
    failed: 0,
    unsubscribed: 0,
    remaining: rows.length - 2,
  });
  assert.deepEqual(
    sent.map(({ idempotencyKey }) => idempotencyKey),
    first.map(
      ({ customerId }) => `campaign-${campaign.id}-customer-${customerId}`,
    ),
  );
  assert.deepEqual(sent[0].headers, unsubscribeHeaders(first[0].customerId));
  assert.deepEqual(
    first.map(({ status, sentAt }) => ({ status, sentAt })),
    [
      { status: "SENT", sentAt: NOW },
      { status: "SENT", sentAt: NOW },
    ],
  );
  assert.ok(first.every(({ resendEmailId }) => resendEmailId));
  assert.ok(rows.slice(2).every(({ status }) => status === "PENDING"));
});

test("a batch sends nothing once the day's limit is reached", async () => {
  await buyer(["2026-01-01"]);
  const campaign = await restock();
  await usedToday(80);
  const { sent, send } = recorder();

  const batch = await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send,
  });

  assert.equal(sent.length, 0);
  assert.equal(batch.sent, 0);
  assert.equal(batch.remaining, (await recipients(campaign.id)).length);
});

test("someone who unsubscribed after the campaign was made is skipped without spending the limit", async () => {
  const leaving = await buyer(["2020-01-01"]);
  const staying = await buyer(["2020-01-02"]);
  const campaign = await restock();
  const rows = await recipients(campaign.id);
  assert.equal(rows[0].customerId, leaving.customerId);
  await prisma.consent.updateMany({
    where: { order: { customerId: leaving.customerId } },
    data: { withdrawnAt: NOW },
  });
  await usedToday(79);
  const { sent, send } = recorder();

  const batch = await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send,
  });

  const after = await recipients(campaign.id);
  assert.equal(after[0].status, "UNSUBSCRIBED");
  assert.equal(batch.unsubscribed, 1);
  assert.equal(batch.sent, 1);
  assert.equal(sent[0].to, staying.email);
  assert.equal(after[1].customerId, staying.customerId);
  assert.equal(after[1].status, "SENT");
});

test("a failed send is tried again by the next batch, and a skipped one stops the batch", async () => {
  await buyer(["2020-01-01"]);
  const campaign = await restock();
  await usedToday(79);

  const failing = recorder("FAILED");
  await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send: failing.send,
  });
  assert.equal((await recipients(campaign.id))[0].status, "FAILED");

  await usedToday(78);
  const skipping = recorder("SKIPPED");
  const skipped = await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send: skipping.send,
  });
  assert.equal(skipping.sent.length, 1);
  assert.equal(skipped.remaining, (await recipients(campaign.id)).length);
  assert.equal((await recipients(campaign.id))[0].status, "FAILED");

  const working = recorder();
  await sendCampaignBatch(campaign.id, () => MESSAGE, {
    now: NOW,
    send: working.send,
  });
  assert.equal(working.sent[0].idempotencyKey, failing.sent[0].idempotencyKey);
  assert.equal((await recipients(campaign.id))[0].status, "SENT");
});

test("erasing a customer takes them off every campaign still waiting to reach them", async () => {
  const erased = await buyer(["2020-01-01"]);
  const campaign = await restock();
  await prisma.order.updateMany({
    where: { customerId: erased.customerId },
    data: { cancelledAt: NOW },
  });

  const result = await eraseCustomer(erased.email, { apply: true, now: NOW });

  assert.equal(result.found && result.applied, true);
  const row = await prisma.campaignRecipient.findUniqueOrThrow({
    where: {
      campaignId_customerId: {
        campaignId: campaign.id,
        customerId: erased.customerId,
      },
    },
  });
  assert.equal(row.status, "UNSUBSCRIBED");
});

test("a sold-out or unpublished product cannot be advertised", async () => {
  await buyer(["2026-01-01"]);
  const soldOut = await prisma.product.findUniqueOrThrow({
    where: { slug: "pchelen-prashets-1kg" },
    select: { id: true, stock: true },
  });
  const draft = await prisma.product.findFirstOrThrow({
    where: { isPublished: false },
    select: { id: true },
  });
  const runningOn = async (productId: number) => {
    const promotion = await prisma.promotion.create({
      data: {
        productId,
        kind: "PERCENT",
        value: 10,
        startsOn: TODAY,
        endsOn: TODAY,
        createdBy: ADMIN,
      },
    });
    promotions.push(promotion.id);
    return promotion.id;
  };
  const onSoldOut = await runningOn(soldOut.id);
  const onDraft = await runningOn(draft.id);

  await prisma.product.update({
    where: { id: soldOut.id },
    data: { stock: "NONE" },
  });
  try {
    for (const promotionId of [onSoldOut, onDraft]) {
      assert.deepEqual(
        await createCampaign(
          { kind: "PROMOTION", text: "Промоция", promotionId },
          ADMIN,
          NOW,
        ),
        { ok: false, code: "PROMOTION_NOT_RUNNING" },
      );
    }
    assert.deepEqual(
      await createCampaign(
        { kind: "RESTOCK", text: "Ново зареждане", productIds: [soldOut.id] },
        ADMIN,
        NOW,
      ),
      { ok: false, code: "UNKNOWN_PRODUCT" },
    );
  } finally {
    await prisma.product.update({
      where: { id: soldOut.id },
      data: { stock: soldOut.stock },
    });
  }
});
