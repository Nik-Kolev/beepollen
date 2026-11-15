import type { PromotionKind } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

export const HISTORY_SHOWN = 10;

export type HistoryEntry =
  | {
      type: "PRICE";
      id: number;
      at: Date;
      fromCents: number;
      toCents: number;
      changedBy: string;
    }
  | {
      type: "PROMOTION";
      id: number;
      at: Date;
      kind: PromotionKind;
      value: number;
      startsOn: string;
      endsOn: string;
      endedAt: Date | null;
    };

export async function priceHistory(productId: number, all = false) {
  const take = all ? undefined : HISTORY_SHOWN + 1;
  const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
  const [changes, promotions] = await Promise.all([
    prisma.priceChange.findMany({
      where: { productId },
      orderBy,
      take,
      select: {
        id: true,
        createdAt: true,
        fromCents: true,
        toCents: true,
        changedBy: true,
      },
    }),
    prisma.promotion.findMany({
      where: { productId },
      orderBy,
      take,
      select: {
        id: true,
        createdAt: true,
        kind: true,
        value: true,
        startsOn: true,
        endsOn: true,
        endedAt: true,
      },
    }),
  ]);

  const entries: HistoryEntry[] = [
    ...changes.map(({ createdAt, ...change }) => ({
      type: "PRICE" as const,
      at: createdAt,
      ...change,
    })),
    ...promotions.map(({ createdAt, ...promotion }) => ({
      type: "PROMOTION" as const,
      at: createdAt,
      ...promotion,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return all
    ? { entries, more: false }
    : {
        entries: entries.slice(0, HISTORY_SHOWN),
        more: entries.length > HISTORY_SHOWN,
      };
}
