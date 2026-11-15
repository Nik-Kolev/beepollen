import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import {
  campaignHistory,
  campaignMessageBuilder,
  availableBudget,
  campaignOptions,
  previewCampaign,
  recentCampaign,
  resumeCampaign,
  sendCampaignNow,
  startCampaign,
} from "@/lib/campaign-messages";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { unsubscribeUrl } from "@/lib/subscriptions";

import { validCheckoutInput } from "./support/checkout";

const ADMIN = "admin@example.com";
const promotions: number[] = [];

async function cleanCampaigns() {
  await prisma.campaign.deleteMany({
    where: { createdAt: { gte: new Date("2032-01-01T00:00:00Z") } },
  });
}

after(async () => {
  await cleanCampaigns();
  await prisma.promotion.deleteMany({ where: { id: { in: promotions } } });
  await prisma.$disconnect();
});

async function subscriber() {
  const result = await placeOrder(
    validCheckoutInput({ acceptsOffers: true, idempotencyKey: randomUUID() }),
    null,
  );
  if (!result.ok) throw new Error("order was refused");
}

async function product(slug: string) {
  return prisma.product.findUniqueOrThrow({
    where: { slug },
    select: { id: true, priceCents: true },
  });
}

async function runningPromotion(day: string) {
  const { id: productId } = await product("pchelen-prashets-500g");
  const promotion = await prisma.promotion.create({
    data: {
      productId,
      kind: "PERCENT",
      value: 25,
      startsOn: day,
      endsOn: day,
      createdBy: ADMIN,
    },
  });
  promotions.push(promotion.id);
  return promotion.id;
}

function restockOn(createdAt: Date, productIds: number[] = []) {
  return startCampaign(
    {
      campaign: { kind: "RESTOCK", text: "Ново зареждане", productIds },
      confirmedRecent: true,
    },
    ADMIN,
    createdAt,
  );
}

test("the preview renders the promotion email with today's promotion price and same-origin photos", async () => {
  const day = "2032-02-02";
  const promotionId = await runningPromotion(day);
  const { priceCents } = await product("pchelen-prashets-500g");

  const result = await previewCampaign(
    { kind: "PROMOTION", text: "<i>Текст</i>", promotionId },
    new Date(`${day}T10:00:00Z`),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.subject, "Промоция: Пчелен прашец 500 г");
  assert.ok(result.html.includes('src="/products/'));
  assert.ok(!result.html.includes(`src="${SITE_URL}/products/`));
  assert.ok(result.html.includes("&lt;i&gt;Текст&lt;/i&gt;"));
  const promo = new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format((priceCents * 0.75) / 100);
  assert.ok(result.html.includes(promo), promo);
});

test("a preview of a crafted or unknown campaign is refused", async () => {
  assert.deepEqual(await previewCampaign({ kind: "RESTOCK", text: "" }), {
    ok: false,
    code: "INVALID_INPUT",
  });
  assert.deepEqual(
    await previewCampaign({
      kind: "PROMOTION",
      text: "Текст",
      promotionId: 999999,
    }),
    { ok: false, code: "UNKNOWN_CAMPAIGN" },
  );
});

test("a stored campaign builds each recipient's email with their own unsubscribe link, products in the chosen order", async () => {
  await subscriber();
  const first = await product("pchelen-prashets-1kg");
  const second = await product("pchelen-prashets-500g");
  const created = await restockOn(new Date("2032-03-01T10:00:00Z"), [
    first.id,
    second.id,
  ]);
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const build = await campaignMessageBuilder(created.id);
  assert.ok(build);
  const message = build(42);

  assert.equal(
    message.subject,
    "Ново зареждане: Пчелен прашец 1 кг, Пчелен прашец 500 г",
  );
  assert.ok(message.html.includes(`href="${unsubscribeUrl(42)}"`));
  assert.ok(
    message.html.indexOf("pchelen-prashets-1kg") <
      message.html.indexOf("pchelen-prashets-500g"),
  );
  await cleanCampaigns();
});

test("a campaign sent fourteen days ago or less is recent, fifteen days ago is not", async () => {
  await subscriber();
  await cleanCampaigns();
  const created = await restockOn(new Date("2032-04-01T21:30:00Z"));
  assert.equal(created.ok, true);

  assert.deepEqual(await recentCampaign(new Date("2032-04-16T10:00:00Z")), {
    subject: "Ново зареждане",
    sentOn: "2032-04-02",
  });
  assert.equal(await recentCampaign(new Date("2032-04-17T10:00:00Z")), null);
  await cleanCampaigns();
});

test("a new campaign within fourteen days of the last one waits for the admin to confirm it", async () => {
  await subscriber();
  await cleanCampaigns();
  await restockOn(new Date("2032-05-01T10:00:00Z"));
  const input = {
    campaign: { kind: "RESTOCK", text: "Пак", productIds: [] },
    confirmedRecent: false,
  };
  const now = new Date("2032-05-10T10:00:00Z");

  const refused = await startCampaign(input, ADMIN, now);
  assert.deepEqual(refused, {
    ok: false,
    code: "RECENT",
    recent: {
      subject: "Ново зареждане",
      sentOn: "2032-05-01",
    },
  });
  assert.equal(
    await prisma.campaign.count({
      where: { createdAt: { gte: new Date("2032-05-02T00:00:00Z") } },
    }),
    0,
  );

  const started = await startCampaign(
    { ...input, confirmedRecent: true },
    ADMIN,
    now,
  );
  assert.equal(started.ok, true);
  if (started.ok) {
    assert.ok(started.recipients > 0);
    assert.ok(started.sendingNow <= started.recipients);
    assert.deepEqual(started.sent, {
      subject: "Ново зареждане",
      sentOn: "2032-05-10",
    });
  }
  assert.deepEqual(
    await startCampaign({ ...input, confirmedRecent: "true" }, ADMIN, now),
    { ok: false, code: "INVALID_INPUT" },
  );
  await cleanCampaigns();
});

test("the form offers only promotions running today and products on sale", async () => {
  const day = "2032-06-06";
  const running = await runningPromotion(day);
  const later = await runningPromotion("2032-06-07");

  const options = await campaignOptions(new Date(`${day}T10:00:00Z`));

  const ids = options.promotions.map(({ id }) => id);
  assert.ok(ids.includes(running));
  assert.ok(!ids.includes(later));
  assert.match(
    options.promotions.find(({ id }) => id === running)?.label ?? "",
    /^Пчелен прашец 500 г −25% \(06\.06\.2032 – 06\.06\.2032\)$/,
  );
  const chosen = options.promotions.find(({ id }) => id === running);
  assert.equal(chosen?.productName, "Пчелен прашец 500 г");
  assert.equal(chosen?.endsOn, day);
  const published = await prisma.product.findMany({
    where: { isPublished: true, stock: { not: "NONE" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  assert.deepEqual(options.products, published);
});

test("the form leaves out an ended promotion and products not on sale", async () => {
  const day = "2032-07-07";
  const ended = await runningPromotion(day);
  await prisma.promotion.update({
    where: { id: ended },
    data: { endedAt: new Date(`${day}T08:00:00Z`) },
  });
  const soldOut = await product("pchelen-prashets-1kg");
  const { stock } = await prisma.product.findUniqueOrThrow({
    where: { id: soldOut.id },
  });
  await prisma.product.update({
    where: { id: soldOut.id },
    data: { stock: "NONE" },
  });
  try {
    const options = await campaignOptions(new Date(`${day}T10:00:00Z`));
    assert.ok(!options.promotions.some(({ id }) => id === ended));
    assert.ok(!options.products.some(({ id }) => id === soldOut.id));
    const draft = await prisma.product.findFirstOrThrow({
      where: { isPublished: false },
    });
    assert.ok(!options.products.some(({ id }) => id === draft.id));
  } finally {
    await prisma.product.update({
      where: { id: soldOut.id },
      data: { stock },
    });
  }
});

test("a campaign whose promotion has ended, or whose products are all off sale, builds no email", async () => {
  await subscriber();
  const day = "2032-08-08";
  const promotionId = await runningPromotion(day);
  const promotionCampaign = await startCampaign(
    {
      campaign: { kind: "PROMOTION", text: "Промоция", promotionId },
      confirmedRecent: true,
    },
    ADMIN,
    new Date(`${day}T10:00:00Z`),
  );
  const soldOut = await product("pchelen-prashets-1kg");
  const restockCampaign = await restockOn(new Date(`${day}T10:00:00Z`), [
    soldOut.id,
  ]);
  assert.ok(promotionCampaign.ok && restockCampaign.ok);
  if (!promotionCampaign.ok || !restockCampaign.ok) return;

  assert.ok(
    await campaignMessageBuilder(
      promotionCampaign.id,
      new Date(`${day}T10:00:00Z`),
    ),
  );
  assert.equal(
    await campaignMessageBuilder(
      promotionCampaign.id,
      new Date("2032-08-09T10:00:00Z"),
    ),
    null,
  );

  const { stock } = await prisma.product.findUniqueOrThrow({
    where: { id: soldOut.id },
  });
  await prisma.product.update({
    where: { id: soldOut.id },
    data: { stock: "NONE" },
  });
  try {
    assert.equal(await campaignMessageBuilder(restockCampaign.id), null);
  } finally {
    await prisma.product.update({
      where: { id: soldOut.id },
      data: { stock },
    });
    await cleanCampaigns();
  }
});

async function usedOn(now: Date, count: number) {
  await prisma.emailSend.deleteMany({
    where: { createdAt: { gte: new Date("2032-12-01T00:00:00Z") } },
  });
  await prisma.emailSend.createMany({
    data: Array.from({ length: count }, () => ({
      status: "SENT" as const,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    })),
  });
}

async function setStatuses(
  campaignId: number,
  statuses: ("SENT" | "FAILED" | "UNSUBSCRIBED")[],
) {
  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  for (const [index, status] of statuses.entries()) {
    await prisma.campaignRecipient.update({
      where: { id: rows[index].id },
      data: { status },
    });
  }
  return rows.length;
}

test("the history lists campaigns newest first with what was sent and what still waits", async () => {
  await subscriber();
  await subscriber();
  await subscriber();
  await cleanCampaigns();
  const older = await restockOn(new Date("2032-09-01T10:00:00Z"));
  const kg = await product("pchelen-prashets-1kg");
  const newer = await restockOn(new Date("2032-09-03T10:00:00Z"), [kg.id]);
  assert.ok(older.ok && newer.ok);
  if (!older.ok || !newer.ok) return;
  const total = await setStatuses(newer.id, ["SENT", "FAILED", "UNSUBSCRIBED"]);

  const history = await campaignHistory();

  assert.deepEqual(history.slice(0, 2), [
    {
      id: newer.id,
      kind: "RESTOCK",
      products: ["Пчелен прашец 1 кг"],
      sentOn: "2032-09-03",
      total,
      sent: 1,
      waiting: total - 3,
      failed: 1,
      unsubscribed: 1,
      pending: total - 2,
    },
    {
      id: older.id,
      kind: "RESTOCK",
      products: [],
      sentOn: "2032-09-01",
      total: older.recipients,
      sent: 0,
      waiting: older.recipients,
      failed: 0,
      unsubscribed: 0,
      pending: older.recipients,
    },
  ]);
  await cleanCampaigns();
});

test("sending to the rest is refused for an unknown, finished or ended campaign, or once the day's limit is spent", async () => {
  await subscriber();
  await cleanCampaigns();
  const day = "2032-12-12";
  const now = new Date(`${day}T10:00:00Z`);
  const promotionId = await runningPromotion(day);
  const started = await startCampaign(
    {
      campaign: { kind: "PROMOTION", text: "Промоция", promotionId },
      confirmedRecent: true,
    },
    ADMIN,
    now,
  );
  assert.ok(started.ok);
  if (!started.ok) return;

  for (const crafted of [999999, "1", -1, 0, 1.5, null]) {
    assert.deepEqual(await resumeCampaign(crafted, now), {
      ok: false,
      code: "UNKNOWN_CAMPAIGN",
    });
  }

  await usedOn(now, 78);
  assert.deepEqual(await resumeCampaign(started.id, now), {
    ok: true,
    id: started.id,
    sendingNow: Math.min(2, started.recipients),
    pending: started.recipients,
  });

  await usedOn(now, 80);
  assert.deepEqual(await resumeCampaign(started.id, now), {
    ok: false,
    code: "NO_BUDGET",
  });

  assert.deepEqual(
    await resumeCampaign(started.id, new Date("2032-12-13T10:00:00Z")),
    { ok: false, code: "CAMPAIGN_OVER" },
  );

  await prisma.campaignRecipient.updateMany({
    where: { campaignId: started.id },
    data: { status: "SENT" },
  });
  assert.deepEqual(await resumeCampaign(started.id, now), {
    ok: false,
    code: "NOTHING_PENDING",
  });

  await prisma.emailSend.deleteMany({
    where: { createdAt: { gte: new Date("2032-12-01T00:00:00Z") } },
  });
  await cleanCampaigns();
});

test("a batch waiting in the queue is taken off the day's limit until it has run", async () => {
  const now = new Date();
  const before = await availableBudget(now);
  const errors = console.error;
  console.error = () => {};
  try {
    const queued = sendCampaignNow(999999, 5);
    assert.equal(await availableBudget(now), Math.max(0, before - 5));
    await queued;
  } finally {
    console.error = errors;
  }
  assert.equal(await availableBudget(now), before);
});
