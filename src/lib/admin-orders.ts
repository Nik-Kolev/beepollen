import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type { Carrier, ConsentKind } from "@/generated/prisma/enums";
import { DeliveryMethod, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import prisma from "@/lib/prisma";

export const ORDER_STATUSES = [
  "new",
  "sent",
  "paid",
  "returned",
  "collected",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Нова",
  sent: "Чака плащане",
  paid: "Платена",
  returned: "Върната — за прибиране",
  collected: "Отказана",
  cancelled: "Отказана",
};

type OrderState = {
  deliveryMethod: DeliveryMethod;
  sentAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  collectedAt: Date | null;
};

export function orderStatus(order: OrderState): OrderStatus {
  if (order.cancelledAt) {
    if (!order.sentAt) return "cancelled";
    return order.collectedAt ? "collected" : "returned";
  }
  if (order.paidAt) return "paid";
  if (order.sentAt) return "sent";
  return "new";
}

export const ORDER_STEPS = [
  "send",
  "handOver",
  "pay",
  "cancel",
  "return",
  "collect",
  "undo",
] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

export const ORDER_STEP_LABEL: Record<OrderStep, string> = {
  send: "Изпратена",
  handOver: "Предадена и платена",
  pay: "Платена",
  cancel: "Откажи",
  return: "Върната",
  collect: "Прибрана",
  undo: "Върни назад",
};

export function nextOrderSteps(order: OrderState): OrderStep[] {
  switch (orderStatus(order)) {
    case "new":
      return order.deliveryMethod === DeliveryMethod.LOCAL
        ? ["handOver", "cancel"]
        : ["send", "cancel"];
    case "sent":
      return ["pay", "return"];
    case "returned":
      return ["collect"];
    default:
      return [];
  }
}

export function undoTarget(order: OrderState): OrderStatus | null {
  switch (orderStatus(order)) {
    case "new":
      return null;
    case "sent":
    case "cancelled":
      return "new";
    case "paid":
      return order.deliveryMethod === DeliveryMethod.LOCAL ? "new" : "sent";
    case "returned":
      return "sent";
    case "collected":
      return "returned";
  }
}

function stepData(
  order: OrderState,
  step: OrderStep,
  now: Date,
): Prisma.OrderUpdateInput | null {
  if (step === "undo") {
    switch (orderStatus(order)) {
      case "new":
        return null;
      case "sent":
        return { sentAt: null };
      case "paid":
        return order.deliveryMethod === DeliveryMethod.LOCAL
          ? { sentAt: null, paidAt: null }
          : { paidAt: null };
      case "returned":
      case "cancelled":
        return { cancelledAt: null };
      case "collected":
        return { collectedAt: null };
    }
  }

  if (!nextOrderSteps(order).includes(step)) return null;
  switch (step) {
    case "send":
      return { sentAt: now };
    case "handOver":
      return { sentAt: now, paidAt: now };
    case "pay":
      return { paidAt: now };
    case "cancel":
    case "return":
      return { cancelledAt: now };
    case "collect":
      return { collectedAt: now };
  }
}

export const orderStepInput = z.object({
  reference: z.string().min(1).max(32),
  step: z.enum(ORDER_STEPS),
  expected: z.enum(ORDER_STATUSES),
  confirmed: z.boolean().optional(),
});

export type OrderStepResult =
  { ok: true } | { ok: false; reason: "stale" | "refused" | "withdrawn" };

const DISPATCH_STEPS: readonly OrderStep[] = ["send", "handOver"];

export async function applyOrderStep(
  reference: string,
  step: OrderStep,
  expected: OrderStatus,
  now = new Date(),
  confirmed = false,
): Promise<OrderStepResult> {
  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      deliveryMethod: true,
      sentAt: true,
      paidAt: true,
      cancelledAt: true,
      collectedAt: true,
      withdrawnAt: true,
    },
  });
  if (!order) return { ok: false, reason: "refused" };
  if (orderStatus(order) !== expected) return { ok: false, reason: "stale" };
  if (order.withdrawnAt && DISPATCH_STEPS.includes(step) && !confirmed) {
    return { ok: false, reason: "withdrawn" };
  }

  const data = stepData(order, step, now);
  if (!data) return { ok: false, reason: "refused" };

  const { count } = await prisma.order.updateMany({
    where: {
      reference,
      sentAt: order.sentAt,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      collectedAt: order.collectedAt,
    },
    data,
  });
  return count === 1 ? { ok: true } : { ok: false, reason: "stale" };
}

const sofiaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Sofia",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function calendarDaysSince(date: Date, now: Date) {
  const day = (value: Date) => {
    const parts = Object.fromEntries(
      sofiaDay.formatToParts(value).map((part) => [part.type, part.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
    );
  };
  return Math.round((day(now) - day(date)) / (24 * 60 * 60 * 1000));
}

export function daysAgoLabel(verb: string, date: Date, now: Date) {
  const days = calendarDaysSince(date, now);
  if (days <= 0) return `${verb} днес`;
  if (days === 1) return `${verb} вчера`;
  return `${verb} преди ${days} дни`;
}

export const ORDER_FILTERS = [
  "all",
  "new",
  "sent",
  "returned",
  "paid",
  "cancelled",
] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];
export type OrderView = OrderFilter | "open";

export const DEFAULT_ORDER_FILTER: OrderFilter = "all";

export const ORDER_FILTER_LABEL: Record<OrderFilter, string> = {
  all: "Всички",
  new: "Нови",
  sent: "Чакат плащане",
  returned: "За прибиране",
  paid: "Платени",
  cancelled: "Отказани",
};

export function orderView(filter: OrderFilter, hideClosed: boolean): OrderView {
  return filter === "all" && hideClosed ? "open" : filter;
}

export function parseHideClosed(value: unknown) {
  return value === "1";
}

const NEW_WHERE: Prisma.OrderWhereInput = {
  sentAt: null,
  paidAt: null,
  cancelledAt: null,
};
const SENT_WHERE: Prisma.OrderWhereInput = {
  sentAt: { not: null },
  paidAt: null,
  cancelledAt: null,
};
const RETURNED_WHERE: Prisma.OrderWhereInput = {
  sentAt: { not: null },
  cancelledAt: { not: null },
  collectedAt: null,
};

const ORDER_VIEW_WHERE: Record<OrderView, Prisma.OrderWhereInput> = {
  open: { OR: [NEW_WHERE, SENT_WHERE, RETURNED_WHERE] },
  new: NEW_WHERE,
  sent: SENT_WHERE,
  returned: RETURNED_WHERE,
  paid: { paidAt: { not: null }, cancelledAt: null },
  cancelled: {
    cancelledAt: { not: null },
    OR: [{ sentAt: null }, { collectedAt: { not: null } }],
  },
  all: {},
};

export function parseOrderFilter(value: unknown): OrderFilter {
  return (
    ORDER_FILTERS.find((filter) => filter === value) ?? DEFAULT_ORDER_FILTER
  );
}

const ORDER_VIEWS = [...ORDER_FILTERS, "open"] as const;

export async function countOrdersByView() {
  const counts = await Promise.all(
    ORDER_VIEWS.map((view) =>
      prisma.order.count({ where: ORDER_VIEW_WHERE[view] }),
    ),
  );
  return Object.fromEntries(
    ORDER_VIEWS.map((view, index) => [view, counts[index]]),
  ) as Record<OrderView, number>;
}

export const CARRIER_LABEL: Record<Carrier, string> = {
  ECONT: "Еконт",
  SPEEDY: "Спиди",
};

export const CONSENT_LABEL: Record<ConsentKind, string> = {
  TERMS: "Общи условия",
  OFFERS: "Оферти по имейл",
};

export const ORDERS_STEP = 5;

export function parseOrderShown(value: unknown, total: number) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return ORDERS_STEP;
  }
  const shown = Number(value);
  return Math.min(Math.max(shown, ORDERS_STEP), Math.max(total, ORDERS_STEP));
}

export function orderListHref(
  filter: OrderFilter,
  shown: number,
  hideClosed = false,
) {
  const params = new URLSearchParams();
  if (filter !== DEFAULT_ORDER_FILTER) params.set("filter", filter);
  if (filter === "all" && hideClosed) params.set("open", "1");
  if (shown > ORDERS_STEP) params.set("shown", String(shown));
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export function listOrders(view: OrderView = "all", shown = ORDERS_STEP) {
  return prisma.order.findMany({
    where: ORDER_VIEW_WHERE[view],
    orderBy: { id: "desc" },
    take: shown,
    select: ORDER_DETAIL,
  });
}

const ORDER_DETAIL = {
  reference: true,
  createdAt: true,
  sentAt: true,
  paidAt: true,
  cancelledAt: true,
  collectedAt: true,
  withdrawnAt: true,
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
} satisfies Prisma.OrderSelect;

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
