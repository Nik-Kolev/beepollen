import { z } from "zod";

import { StockLevel } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { sofiaToday } from "@/lib/promotions";

export const STOCK_LABEL: Record<StockLevel, string> = {
  PLENTY: "В наличност",
  LOW: "Малко количество",
  NONE: "Изчерпан",
};

const PRICE_PATTERN = /^(\d{1,6})(?:[.,](\d{1,2}))?$/;

export function parsePriceCents(text: string): number | null {
  const match = PRICE_PATTERN.exec(text.trim());
  if (!match) return null;

  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function formatPriceInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export const productEditInput = z.object({
  slug: z.string().min(1).max(100),
  price: z.string().max(20),
  stock: z.enum(StockLevel),
  endPromotionIds: z.array(z.number().int().positive()).max(20).optional(),
});

export type OpenPromotion = {
  id: number;
  kind: "PERCENT" | "PRICE";
  value: number;
  startsOn: string;
  endsOn: string;
};

export type ProductEditResult =
  | { ok: true; slug: string }
  | { ok: false; code: "INVALID_PRICE" | "INVALID_INPUT" | "UNKNOWN_PRODUCT" }
  | { ok: false; code: "PROMOTION_OPEN"; promotions: OpenPromotion[] };

function allConfirmed(open: OpenPromotion[], confirmed: number[] = []) {
  return open.every(({ id }) => confirmed.includes(id));
}

export async function editProduct(
  input: unknown,
  now = new Date(),
  today = sofiaToday(now),
): Promise<ProductEditResult> {
  const parsed = productEditInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { slug, stock, endPromotionIds } = parsed.data;

  const priceCents = parsePriceCents(parsed.data.price);
  if (priceCents === null) return { ok: false, code: "INVALID_PRICE" };

  return prisma.$transaction(async (tx): Promise<ProductEditResult> => {
    const product = await tx.product.findUnique({
      where: { slug },
      select: { id: true, priceCents: true },
    });
    if (!product) return { ok: false, code: "UNKNOWN_PRODUCT" };

    if (priceCents !== product.priceCents) {
      const open = await tx.promotion.findMany({
        where: { productId: product.id, endedAt: null, endsOn: { gte: today } },
        orderBy: [{ startsOn: "asc" }, { id: "asc" }],
        select: {
          id: true,
          kind: true,
          value: true,
          startsOn: true,
          endsOn: true,
        },
      });
      if (open.length > 0) {
        if (!allConfirmed(open, endPromotionIds)) {
          return { ok: false, code: "PROMOTION_OPEN", promotions: open };
        }
        await tx.promotion.updateMany({
          where: { id: { in: open.map(({ id }) => id) }, endedAt: null },
          data: { endedAt: now },
        });
      }
    }

    await tx.product.update({
      where: { id: product.id },
      data: { priceCents, stock },
    });
    return { ok: true, slug };
  });
}

export function listProductsForAdmin() {
  return prisma.product.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      stock: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { path: true, alt: true },
      },
    },
  });
}
