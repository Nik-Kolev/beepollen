import { z } from "zod";

import type { CampaignRecipientStatus } from "@/generated/prisma/enums";
import { CAMPAIGN_KIND_LABEL, formatCampaignDay } from "@/lib/campaign-labels";
import {
  campaignBudget,
  campaignInput,
  type CampaignRefusal,
  createCampaign,
  sendCampaignBatch,
} from "@/lib/campaigns";
import {
  type CampaignProductData,
  promotionEmail,
  promotionSubject,
  restockEmail,
  restockSubject,
  type RestockVariant,
} from "@/lib/email/campaign-templates";
import type { EmailMessage } from "@/lib/email/templates";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma";
import {
  activePromotionQuery,
  promoPriceCents,
  sofiaToday,
  withPromotion,
} from "@/lib/promotions";
import { SITE_URL } from "@/lib/site";
import { unsubscribeUrl } from "@/lib/subscriptions";

export const CAMPAIGN_RESTOCK_VARIANT: RestockVariant = "list";
export const RECENT_CAMPAIGN_DAYS = 14;
export const PREVIEW_UNSUBSCRIBE_URL = `${SITE_URL}/subscription/unsubscribe?token=preview`;

const ON_SALE = { isPublished: true, stock: { not: "NONE" as const } };

function runningOn(today: string) {
  return {
    endedAt: null,
    startsOn: { lte: today },
    endsOn: { gte: today },
    product: ON_SALE,
  };
}

type Draft = z.infer<typeof campaignInput>;

type Compose = (unsubscribeUrl: string) => EmailMessage;

const PRODUCT_FIELDS = {
  slug: true,
  name: true,
  priceCents: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { path: true, alt: true },
  },
};

function toProductData(product: {
  slug: string;
  name: string;
  priceCents: number;
  regularPriceCents: number | null;
  images: { path: string; alt: string }[];
}): CampaignProductData {
  return {
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? null,
    priceCents: product.priceCents,
    regularPriceCents: product.regularPriceCents,
  };
}

async function composer(draft: Draft, today: string): Promise<Compose | null> {
  if (draft.kind === "PROMOTION") {
    const promotion = await prisma.promotion.findFirst({
      where: { id: draft.promotionId, ...runningOn(today) },
      select: {
        kind: true,
        value: true,
        startsOn: true,
        endsOn: true,
        product: { select: PRODUCT_FIELDS },
      },
    });
    if (!promotion) return null;
    const { product } = promotion;
    const cents = promoPriceCents(product.priceCents, promotion);
    if (cents === null) return null;

    return (unsubscribe) =>
      promotionEmail({
        text: draft.text,
        product: {
          ...toProductData({ ...product, regularPriceCents: null }),
          priceCents: cents,
          regularPriceCents: product.priceCents,
        },
        startsOn: promotion.startsOn,
        endsOn: promotion.endsOn,
        unsubscribeUrl: unsubscribe,
      });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: draft.productIds }, ...ON_SALE },
    select: {
      id: true,
      ...PRODUCT_FIELDS,
      promotions: activePromotionQuery(today),
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const ordered = draft.productIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [toProductData(withPromotion(product))] : [];
  });
  if (draft.productIds.length > 0 && ordered.length === 0) return null;

  return (unsubscribe) =>
    restockEmail(
      { text: draft.text, products: ordered, unsubscribeUrl: unsubscribe },
      CAMPAIGN_RESTOCK_VARIANT,
    );
}

export type CampaignPreview =
  | { ok: true; subject: string; html: string }
  | { ok: false; code: "INVALID_INPUT" | "UNKNOWN_CAMPAIGN" };

export async function previewCampaign(
  input: unknown,
  now = new Date(),
): Promise<CampaignPreview> {
  const parsed = campaignInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const compose = await composer(parsed.data, sofiaToday(now));
  if (!compose) return { ok: false, code: "UNKNOWN_CAMPAIGN" };
  const { subject, html } = compose(PREVIEW_UNSUBSCRIBE_URL);
  return {
    ok: true,
    subject,
    html: html.replaceAll(`src="${SITE_URL}/`, 'src="/'),
  };
}

const STORED_CAMPAIGN = {
  kind: true,
  text: true,
  promotionId: true,
  products: {
    orderBy: { sortOrder: "asc" as const },
    select: { productId: true, product: { select: { name: true } } },
  },
};

export async function campaignMessageBuilder(
  campaignId: number,
  now = new Date(),
): Promise<((customerId: number) => EmailMessage) | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: STORED_CAMPAIGN,
  });
  if (!campaign) return null;

  const draft: Draft | null =
    campaign.kind === "PROMOTION"
      ? campaign.promotionId === null
        ? null
        : {
            kind: "PROMOTION",
            text: campaign.text,
            promotionId: campaign.promotionId,
          }
      : {
          kind: "RESTOCK",
          text: campaign.text,
          productIds: campaign.products.map(({ productId }) => productId),
        };
  if (!draft) return null;

  const compose = await composer(draft, sofiaToday(now));
  return compose && ((customerId) => compose(unsubscribeUrl(customerId)));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBefore(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export type RecentCampaign = { subject: string; sentOn: string };

export async function recentCampaign(
  now = new Date(),
): Promise<RecentCampaign | null> {
  const since = daysBefore(sofiaToday(now), RECENT_CAMPAIGN_DAYS);
  const latest = await prisma.campaign.findFirst({
    where: {
      createdAt: { gte: new Date(Date.parse(`${since}T00:00:00Z`) - DAY_MS) },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      ...STORED_CAMPAIGN,
      createdAt: true,
      promotion: { select: { product: { select: { name: true } } } },
    },
  });
  if (!latest) return null;
  const sentOn = sofiaToday(latest.createdAt);
  if (sentOn < since) return null;

  const subject =
    latest.kind === "PROMOTION"
      ? latest.promotion
        ? promotionSubject(latest.promotion.product.name)
        : CAMPAIGN_KIND_LABEL.PROMOTION
      : restockSubject(latest.products.map(({ product }) => product.name));
  return { subject, sentOn };
}

export type CampaignStartResult =
  | {
      ok: true;
      id: number;
      recipients: number;
      sendingNow: number;
      sent: RecentCampaign | null;
    }
  | { ok: false; code: CampaignRefusal }
  | { ok: false; code: "RECENT"; recent: RecentCampaign };

const startInput = z.object({
  campaign: z.unknown(),
  confirmedRecent: z.boolean(),
});

export async function startCampaign(
  input: unknown,
  adminEmail: string,
  now = new Date(),
): Promise<CampaignStartResult> {
  const parsed = startInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };

  const recent = await recentCampaign(now);
  if (recent && !parsed.data.confirmedRecent) {
    return { ok: false, code: "RECENT", recent };
  }

  const created = await createCampaign(parsed.data.campaign, adminEmail, now);
  if (!created.ok) return created;
  const [budget, sent] = await Promise.all([
    availableBudget(now),
    recentCampaign(now),
  ]);
  return {
    ok: true,
    id: created.id,
    recipients: created.recipients,
    sendingNow: Math.min(budget, created.recipients),
    sent,
  };
}

export async function campaignOptions(now = new Date()) {
  const today = sofiaToday(now);
  const [promotions, products] = await Promise.all([
    prisma.promotion.findMany({
      where: runningOn(today),
      orderBy: { id: "asc" },
      select: {
        id: true,
        kind: true,
        value: true,
        startsOn: true,
        endsOn: true,
        product: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: ON_SALE,
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    promotions: promotions.map((promotion) => {
      const terms =
        promotion.kind === "PERCENT"
          ? `−${promotion.value}%`
          : `на ${formatPrice(promotion.value)}`;
      return {
        id: promotion.id,
        productName: promotion.product.name,
        endsOn: promotion.endsOn,
        label: `${promotion.product.name} ${terms} (${formatCampaignDay(promotion.startsOn)} – ${formatCampaignDay(promotion.endsOn)})`,
      };
    }),
    products,
  };
}

let sending: Promise<void> = Promise.resolve();
let reserved = 0;

export async function availableBudget(now = new Date()) {
  return Math.max(0, (await campaignBudget(now)) - reserved);
}

async function sendNow(campaignId: number) {
  try {
    const build = await campaignMessageBuilder(campaignId);
    if (!build) {
      console.error(`Campaign ${campaignId} has nothing left to send.`);
      return;
    }
    await sendCampaignBatch(campaignId, build);
  } catch (error) {
    console.error(`Sending campaign ${campaignId} failed:`, error);
  }
}

export function sendCampaignNow(campaignId: number, count: number) {
  reserved += count;
  sending = sending
    .then(() => sendNow(campaignId))
    .finally(() => {
      reserved -= count;
    });
  return sending;
}

export const CAMPAIGN_HISTORY_MAX = 50;

export type CampaignHistoryEntry = {
  id: number;
  kind: keyof typeof CAMPAIGN_KIND_LABEL;
  products: string[];
  sentOn: string;
  total: number;
  sent: number;
  waiting: number;
  failed: number;
  unsubscribed: number;
  pending: number;
};

export async function campaignHistory(): Promise<CampaignHistoryEntry[]> {
  const campaigns = await prisma.campaign.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CAMPAIGN_HISTORY_MAX,
    select: {
      id: true,
      kind: true,
      createdAt: true,
      promotion: { select: { product: { select: { name: true } } } },
      products: {
        orderBy: { sortOrder: "asc" },
        select: { product: { select: { name: true } } },
      },
    },
  });
  const counts = await prisma.campaignRecipient.groupBy({
    by: ["campaignId", "status"],
    where: { campaignId: { in: campaigns.map(({ id }) => id) } },
    _count: { _all: true },
  });
  const count = (campaignId: number, statuses: CampaignRecipientStatus[]) =>
    counts
      .filter(
        (row) => row.campaignId === campaignId && statuses.includes(row.status),
      )
      .reduce((sum, row) => sum + row._count._all, 0);

  return campaigns.map((campaign) => {
    const products =
      campaign.kind === "PROMOTION"
        ? campaign.promotion
          ? [campaign.promotion.product.name]
          : []
        : campaign.products.map(({ product }) => product.name);
    const waiting = count(campaign.id, ["PENDING"]);
    const failed = count(campaign.id, ["FAILED"]);
    return {
      id: campaign.id,
      kind: campaign.kind,
      products,
      sentOn: sofiaToday(campaign.createdAt),
      total: count(campaign.id, ["PENDING", "SENT", "FAILED", "UNSUBSCRIBED"]),
      sent: count(campaign.id, ["SENT"]),
      waiting,
      failed,
      unsubscribed: count(campaign.id, ["UNSUBSCRIBED"]),
      pending: waiting + failed,
    };
  });
}

export type CampaignResumeResult =
  | { ok: true; id: number; sendingNow: number; pending: number }
  | {
      ok: false;
      code:
        "UNKNOWN_CAMPAIGN" | "NOTHING_PENDING" | "CAMPAIGN_OVER" | "NO_BUDGET";
    };

export async function resumeCampaign(
  input: unknown,
  now = new Date(),
): Promise<CampaignResumeResult> {
  const parsed = z.number().int().positive().safeParse(input);
  if (!parsed.success) return { ok: false, code: "UNKNOWN_CAMPAIGN" };
  const campaignId = parsed.data;

  const exists = await prisma.campaign.count({ where: { id: campaignId } });
  if (exists === 0) return { ok: false, code: "UNKNOWN_CAMPAIGN" };
  const pending = await prisma.campaignRecipient.count({
    where: { campaignId, status: { in: ["PENDING", "FAILED"] } },
  });
  if (pending === 0) return { ok: false, code: "NOTHING_PENDING" };
  if (!(await campaignMessageBuilder(campaignId, now))) {
    return { ok: false, code: "CAMPAIGN_OVER" };
  }
  const budget = await availableBudget(now);
  if (budget === 0) return { ok: false, code: "NO_BUDGET" };

  return {
    ok: true,
    id: campaignId,
    sendingNow: Math.min(budget, pending),
    pending,
  };
}
