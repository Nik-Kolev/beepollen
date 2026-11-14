import { z } from "zod";

import { parsePriceCents } from "@/lib/admin-products";
import prisma from "@/lib/prisma";
import { promoPriceCents, sofiaToday } from "@/lib/promotions";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDay(text: string) {
  if (!DAY.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

export const promotionInput = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().min(1).max(100),
  kind: z.enum(["PERCENT", "PRICE"]),
  value: z.string().max(20),
  startsOn: z.string().refine(isCalendarDay),
  endsOn: z.string().refine(isCalendarDay),
});

export type PromotionRefusal =
  | "INVALID_INPUT"
  | "INVALID_PERCENT"
  | "INVALID_PRICE"
  | "NOT_LOWER"
  | "INVALID_DATES"
  | "ENDS_IN_PAST"
  | "OVERLAP"
  | "UNKNOWN_PRODUCT"
  | "UNKNOWN_PROMOTION";

export type PromotionSaveResult =
  { ok: true; slug: string } | { ok: false; code: PromotionRefusal };

export function parsePercent(text: string): number | null {
  const match = /^\s*(\d{1,2})\s*%?\s*$/.exec(text);
  if (!match) return null;
  const percent = Number(match[1]);
  return percent >= 1 && percent <= 99 ? percent : null;
}

export async function savePromotion(
  input: unknown,
  adminEmail: string,
  today = sofiaToday(),
): Promise<PromotionSaveResult> {
  const parsed = promotionInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { id, slug, kind, startsOn, endsOn } = parsed.data;

  const value =
    kind === "PERCENT"
      ? parsePercent(parsed.data.value)
      : parsePriceCents(parsed.data.value);
  if (value === null) {
    return {
      ok: false,
      code: kind === "PERCENT" ? "INVALID_PERCENT" : "INVALID_PRICE",
    };
  }
  if (endsOn < startsOn) return { ok: false, code: "INVALID_DATES" };
  if (endsOn < today) return { ok: false, code: "ENDS_IN_PAST" };

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, priceCents: true },
  });
  if (!product) return { ok: false, code: "UNKNOWN_PRODUCT" };
  if (promoPriceCents(product.priceCents, { kind, value }) === null) {
    return { ok: false, code: "NOT_LOWER" };
  }

  return prisma.$transaction(async (tx) => {
    if (id !== undefined) {
      const existing = await tx.promotion.findFirst({
        where: { id, productId: product.id, endedAt: null },
        select: { id: true },
      });
      if (!existing) return { ok: false, code: "UNKNOWN_PROMOTION" };
    }

    const overlapping = await tx.promotion.count({
      where: {
        productId: product.id,
        endedAt: null,
        startsOn: { lte: endsOn },
        endsOn: { gte: startsOn },
        ...(id !== undefined && { id: { not: id } }),
      },
    });
    if (overlapping > 0) return { ok: false, code: "OVERLAP" };

    const data = { kind, value, startsOn, endsOn };
    if (id !== undefined) {
      await tx.promotion.update({ where: { id }, data });
    } else {
      await tx.promotion.create({
        data: { ...data, productId: product.id, createdBy: adminEmail },
      });
    }
    return { ok: true, slug };
  });
}

export type PromotionEndResult =
  { ok: true; slug: string } | { ok: false; code: "UNKNOWN_PROMOTION" };

export async function endPromotion(
  id: unknown,
  now = new Date(),
): Promise<PromotionEndResult> {
  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { ok: false, code: "UNKNOWN_PROMOTION" };

  const promotion = await prisma.promotion.findFirst({
    where: { id: parsed.data, endedAt: null },
    select: { product: { select: { slug: true } } },
  });
  if (!promotion) return { ok: false, code: "UNKNOWN_PROMOTION" };

  const { count } = await prisma.promotion.updateMany({
    where: { id: parsed.data, endedAt: null },
    data: { endedAt: now },
  });
  return count === 1
    ? { ok: true, slug: promotion.product.slug }
    : { ok: false, code: "UNKNOWN_PROMOTION" };
}

export type PromotionStatus = "UPCOMING" | "ACTIVE" | "FINISHED" | "ENDED";

export function promotionStatus(
  promotion: { startsOn: string; endsOn: string; endedAt: Date | null },
  today = sofiaToday(),
): PromotionStatus {
  if (promotion.endedAt) return "ENDED";
  if (promotion.endsOn < today) return "FINISHED";
  if (promotion.startsOn > today) return "UPCOMING";
  return "ACTIVE";
}

export function listPromotionsForAdmin() {
  return prisma.promotion.findMany({
    orderBy: [{ startsOn: "desc" }, { id: "desc" }],
    select: {
      id: true,
      kind: true,
      value: true,
      startsOn: true,
      endsOn: true,
      endedAt: true,
      createdBy: true,
      product: { select: { slug: true } },
    },
  });
}

export type AdminPromotion = Awaited<
  ReturnType<typeof listPromotionsForAdmin>
>[number];
