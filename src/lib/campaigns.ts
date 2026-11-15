import { z } from "zod";

import type { EmailMessage } from "@/lib/email/templates";
import { type Outgoing, type Sent, sendEmail } from "@/lib/email/transport";
import { EMAIL_WARNING_LIMIT, emailUsage } from "@/lib/email/usage";
import prisma from "@/lib/prisma";
import { sofiaToday } from "@/lib/promotions";
import { isSubscribed, unsubscribeHeaders } from "@/lib/subscriptions";

export const CAMPAIGN_PRODUCTS_MAX = 4;
export const CAMPAIGN_TEXT_MAX = 2000;

const text = z.string().trim().min(1).max(CAMPAIGN_TEXT_MAX);

export const campaignInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PROMOTION"),
    text,
    promotionId: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("RESTOCK"),
    text,
    productIds: z
      .array(z.number().int().positive())
      .max(CAMPAIGN_PRODUCTS_MAX)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
]);

const SUBSCRIBER = {
  orders: {
    some: {
      consents: { some: { kind: "OFFERS" as const, withdrawnAt: null } },
    },
  },
};

export function countCampaignRecipients() {
  return prisma.customer.count({ where: SUBSCRIBER });
}

export type CampaignRefusal =
  | "INVALID_INPUT"
  | "PROMOTION_NOT_RUNNING"
  | "UNKNOWN_PRODUCT"
  | "NO_SUBSCRIBERS";

export type CampaignCreateResult =
  | { ok: true; id: number; recipients: number }
  | { ok: false; code: CampaignRefusal };

export async function createCampaign(
  input: unknown,
  adminEmail: string,
  now = new Date(),
): Promise<CampaignCreateResult> {
  const parsed = campaignInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const campaign = parsed.data;
  const today = sofiaToday(now);

  return prisma.$transaction(async (tx): Promise<CampaignCreateResult> => {
    if (campaign.kind === "PROMOTION") {
      const running = await tx.promotion.count({
        where: {
          id: campaign.promotionId,
          endedAt: null,
          startsOn: { lte: today },
          endsOn: { gte: today },
          product: { isPublished: true, stock: { not: "NONE" } },
        },
      });
      if (running === 0) return { ok: false, code: "PROMOTION_NOT_RUNNING" };
    } else {
      const published = await tx.product.count({
        where: {
          id: { in: campaign.productIds },
          isPublished: true,
          stock: { not: "NONE" },
        },
      });
      if (published !== campaign.productIds.length) {
        return { ok: false, code: "UNKNOWN_PRODUCT" };
      }
    }

    const subscribers = await tx.customer.findMany({
      where: SUBSCRIBER,
      select: {
        id: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (subscribers.length === 0) return { ok: false, code: "NO_SUBSCRIBERS" };

    const lastOrder = (subscriber: (typeof subscribers)[number]) =>
      subscriber.orders[0]?.createdAt.getTime() ?? 0;
    const ordered = subscribers.toSorted(
      (a, b) => lastOrder(a) - lastOrder(b) || a.id - b.id,
    );

    const created = await tx.campaign.create({
      data: {
        kind: campaign.kind,
        text: campaign.text,
        createdBy: adminEmail,
        createdAt: now,
        ...(campaign.kind === "PROMOTION"
          ? { promotionId: campaign.promotionId }
          : {
              products: {
                create: campaign.productIds.map((productId, sortOrder) => ({
                  productId,
                  sortOrder,
                })),
              },
            }),
      },
      select: { id: true },
    });
    await tx.campaignRecipient.createMany({
      data: ordered.map(({ id }) => ({
        campaignId: created.id,
        customerId: id,
      })),
    });

    return { ok: true, id: created.id, recipients: ordered.length };
  });
}

export type CampaignBatch = {
  sent: number;
  failed: number;
  unsubscribed: number;
  remaining: number;
};

export async function campaignBudget(now = new Date()) {
  const { sent } = await emailUsage(now);
  return Math.max(0, EMAIL_WARNING_LIMIT - sent);
}

export async function sendCampaignBatch(
  campaignId: number,
  build: (customerId: number) => EmailMessage,
  {
    now = new Date(),
    send = sendEmail,
  }: { now?: Date; send?: (outgoing: Outgoing) => Promise<Sent> } = {},
): Promise<CampaignBatch> {
  const budget = await campaignBudget(now);
  const due = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: { in: ["PENDING", "FAILED"] } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      customerId: true,
      customer: { select: { email: true } },
    },
  });

  const batch: CampaignBatch = {
    sent: 0,
    failed: 0,
    unsubscribed: 0,
    remaining: 0,
  };
  let attempts = 0;
  let stopped = false;

  for (const recipient of due) {
    if (stopped || attempts >= budget) {
      batch.remaining += 1;
      continue;
    }
    if (!(await isSubscribed(recipient.customerId))) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "UNSUBSCRIBED" },
      });
      batch.unsubscribed += 1;
      continue;
    }

    attempts += 1;
    let result: Sent;
    try {
      result = await send({
        to: recipient.customer.email,
        message: build(recipient.customerId),
        idempotencyKey: `campaign-${campaignId}-customer-${recipient.customerId}`,
        headers: unsubscribeHeaders(recipient.customerId),
      });
    } catch (error) {
      console.error("A campaign email could not be sent:", error);
      result = { status: "FAILED", resendEmailId: null };
    }

    if (result.status === "SKIPPED") {
      stopped = true;
      batch.remaining += 1;
      continue;
    }
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data:
        result.status === "SENT"
          ? {
              status: "SENT",
              sentAt: now,
              resendEmailId: result.resendEmailId,
            }
          : { status: "FAILED" },
    });
    if (result.status === "SENT") batch.sent += 1;
    else batch.failed += 1;
  }

  return batch;
}
