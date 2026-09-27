import { cache } from "react";

import type {
  Carrier,
  ConsentKind,
  OrderStatus,
} from "@/generated/prisma/enums";
import { DeliveryMethod, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import prisma from "@/lib/prisma";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Нова",
  SHIPPED: "Изпратена",
  CANCELLED: "Отказана",
};

export const CARRIER_LABEL: Record<Carrier, string> = {
  ECONT: "Еконт",
  SPEEDY: "Спиди",
};

export const CONSENT_LABEL: Record<ConsentKind, string> = {
  TERMS: "Общи условия",
  OFFERS: "Оферти по имейл",
};

export function listOrders() {
  return prisma.order.findMany({
    orderBy: { id: "desc" },
    select: {
      reference: true,
      createdAt: true,
      contactName: true,
      totalCents: true,
      status: true,
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
      status: true,
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
