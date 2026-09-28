import { cache } from "react";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type { Carrier, ConsentKind } from "@/generated/prisma/enums";
import { DeliveryMethod, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import prisma from "@/lib/prisma";

export const ORDER_MARKS = ["sent", "paid", "cancelled"] as const;
export type OrderMark = (typeof ORDER_MARKS)[number];

export const ORDER_MARK_FIELD = {
  sent: "sentAt",
  paid: "paidAt",
  cancelled: "cancelledAt",
} as const satisfies Record<OrderMark, keyof Prisma.OrderUpdateInput>;

export const ORDER_MARK_LABEL: Record<OrderMark, string> = {
  sent: "Изпратена",
  paid: "Платена",
  cancelled: "Отказана",
};

export const ORDER_FILTERS = ["all", "unsent", "unpaid", "cancelled"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export const ORDER_FILTER_LABEL: Record<OrderFilter, string> = {
  all: "Всички",
  unsent: "Неизпратени",
  unpaid: "Неплатени",
  cancelled: "Отказани",
};

const ORDER_FILTER_WHERE: Record<OrderFilter, Prisma.OrderWhereInput> = {
  all: {},
  unsent: { sentAt: null, cancelledAt: null },
  unpaid: { paidAt: null, cancelledAt: null },
  cancelled: { cancelledAt: { not: null } },
};

export function parseOrderFilter(value: unknown): OrderFilter {
  return ORDER_FILTERS.find((filter) => filter === value) ?? "all";
}

export async function countOrdersByFilter() {
  const counts = await Promise.all(
    ORDER_FILTERS.map((filter) =>
      prisma.order.count({ where: ORDER_FILTER_WHERE[filter] }),
    ),
  );
  return Object.fromEntries(
    ORDER_FILTERS.map((filter, index) => [filter, counts[index]]),
  ) as Record<OrderFilter, number>;
}

export const orderMarkInput = z.object({
  reference: z.string().min(1).max(32),
  mark: z.enum(ORDER_MARKS),
  on: z.boolean(),
});

export async function setOrderMark(
  reference: string,
  mark: OrderMark,
  on: boolean,
) {
  const field = ORDER_MARK_FIELD[mark];
  await prisma.order.updateMany({
    where: { reference, [field]: on ? null : { not: null } },
    data: { [field]: on ? new Date() : null },
  });
}

export const CARRIER_LABEL: Record<Carrier, string> = {
  ECONT: "Еконт",
  SPEEDY: "Спиди",
};

export const CONSENT_LABEL: Record<ConsentKind, string> = {
  TERMS: "Общи условия",
  OFFERS: "Оферти по имейл",
};

export function listOrders(filter: OrderFilter = "all") {
  return prisma.order.findMany({
    where: ORDER_FILTER_WHERE[filter],
    orderBy: { id: "desc" },
    select: {
      reference: true,
      createdAt: true,
      contactName: true,
      totalCents: true,
      sentAt: true,
      paidAt: true,
      cancelledAt: true,
      deliveryMethod: true,
      officeCity: true,
    },
  });
}

export const getOrderByReference = cache((reference: string) =>
  prisma.order.findUnique({
    where: { reference },
    select: {
      reference: true,
      createdAt: true,
      sentAt: true,
      paidAt: true,
      cancelledAt: true,
      contactName: true,
      contactPhone: true,
      customer: { select: { email: true } },
      deliveryMethod: true,
      officeCarrier: true,
      officeCode: true,
      officeName: true,
      officeCity: true,
      officeStreet: true,
      itemsCents: true,
      deliveryCents: true,
      totalCents: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
      consents: {
        orderBy: { kind: "asc" },
        select: {
          kind: true,
          wording: true,
          ipAddress: true,
          createdAt: true,
        },
      },
    },
  }),
);

export function deliveryLabel(order: {
  deliveryMethod: DeliveryMethod;
  officeCity: string | null;
}) {
  return order.deliveryMethod === DeliveryMethod.LOCAL
    ? `${LOCAL_DELIVERY_CITY} — на ръка`
    : (order.officeCity ?? "");
}

const sofiaDateTime = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatOrderTime(date: Date) {
  return sofiaDateTime.format(date);
}
