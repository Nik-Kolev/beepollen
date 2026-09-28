import { z } from "zod";

import { StockLevel } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

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
});

export type ProductEditResult =
  | { ok: true; slug: string }
  | { ok: false; code: "INVALID_PRICE" | "INVALID_INPUT" | "UNKNOWN_PRODUCT" };

export async function editProduct(input: unknown): Promise<ProductEditResult> {
  const parsed = productEditInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };

  const priceCents = parsePriceCents(parsed.data.price);
  if (priceCents === null) return { ok: false, code: "INVALID_PRICE" };

  const { count } = await prisma.product.updateMany({
    where: { slug: parsed.data.slug },
    data: { priceCents, stock: parsed.data.stock },
  });
  return count === 1
    ? { ok: true, slug: parsed.data.slug }
    : { ok: false, code: "UNKNOWN_PRODUCT" };
}

export function listProductsForAdmin() {
  return prisma.product.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      stock: true,
      isPublished: true,
    },
  });
}
