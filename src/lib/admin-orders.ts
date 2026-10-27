import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type {
  Carrier,
  ConsentKind,
  EmailStatus,
  OrderEventKind,
} from "@/generated/prisma/enums";
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
  notify: z.boolean().optional(),
});

export type OrderStepResult =
  { ok: true } | { ok: false; reason: "stale" | "refused" | "withdrawn" };

const DISPATCH_STEPS: readonly OrderStep[] = ["send", "handOver"];

const STEP_EVENT: Record<OrderStep, OrderEventKind> = {
  send: "SEND",
  handOver: "HAND_OVER",
  pay: "PAY",
  cancel: "CANCEL",
  return: "RETURN",
  collect: "COLLECT",
  undo: "UNDO",
};

export async function applyOrderStep(
  reference: string,
  step: OrderStep,
  expected: OrderStatus,
  now = new Date(),
  confirmed = false,
  adminEmail: string | null = null,
): Promise<OrderStepResult> {
  const { result } = await recordOrderStep(
    reference,
    step,
    expected,
    now,
    confirmed,
    adminEmail,
  );
  return result;
}

export async function recordOrderStep(
  reference: string,
  step: OrderStep,
  expected: OrderStatus,
  now: Date,
  confirmed: boolean,
  adminEmail: string | null,
): Promise<{ result: OrderStepResult; eventId: number | null }> {
  const refuse = (reason: "stale" | "refused" | "withdrawn") => ({
    result: { ok: false, reason } as const,
    eventId: null,
  });

  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      deliveryMethod: true,
      sentAt: true,
      paidAt: true,
      cancelledAt: true,
      collectedAt: true,
      withdrawnAt: true,
    },
  });
  if (!order) return refuse("refused");
  if (orderStatus(order) !== expected) return refuse("stale");
  if (order.withdrawnAt && DISPATCH_STEPS.includes(step) && !confirmed) {
    return refuse("withdrawn");
  }

  const data = stepData(order, step, now);
  if (!data) return refuse("refused");

  const eventId = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: {
        reference,
        sentAt: order.sentAt,
        paidAt: order.paidAt,
        cancelledAt: order.cancelledAt,
        collectedAt: order.collectedAt,
        withdrawnAt: order.withdrawnAt,
      },
      data,
    });
    if (count !== 1) return null;

    const event = await tx.orderEvent.create({
      data: {
        orderId: order.id,
        kind: STEP_EVENT[step],
        adminEmail,
        createdAt: now,
      },
      select: { id: true },
    });
    return event.id;
  });
  return eventId === null ? refuse("stale") : { result: { ok: true }, eventId };
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

export const ORDER_EVENT_LABEL: Record<OrderEventKind, string> = {
  PLACED: "Получена",
  SEND: "Изпратена",
  HAND_OVER: "Предадена и платена",
  PAY: "Платена",
  CANCEL: "Отказана",
  RETURN: "Върната",
  COLLECT: "Прибрана",
  UNDO: "Стъпката е отменена",
  WITHDRAWN: "Заявен отказ от купувача",
  EDIT: "Данните са редактирани",
};

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  SENT: "имейл до купувача изпратен",
  FAILED: "имейлът до купувача не тръгна",
  SKIPPED: "имейл не е пратен — изпращането не е настроено",
};

export const ORDERS_STEP = 5;
export const ORDERS_MAX = 100;

export function parseOrderShown(value: unknown, total: number) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return ORDERS_STEP;
  }
  const shown = Number(value);
  return Math.min(
    Math.max(shown, ORDERS_STEP),
    Math.max(total, ORDERS_STEP),
    ORDERS_MAX,
  );
}

export function nextOrderShown(shown: number, total: number) {
  const next = Math.min(shown + ORDERS_STEP, ORDERS_MAX);
  return Math.min(next, total) > shown ? next : null;
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
    take: Math.min(shown, ORDERS_MAX),
    select: ORDER_DETAIL,
  });
}

export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

type DuplicateCandidate = {
  reference: string;
  customerId: number;
  createdAt: Date;
  cancelledAt: Date | null;
};

export async function findPossibleDuplicates(orders: DuplicateCandidate[]) {
  const duplicates = new Map<string, string>();
  const live = orders.filter((order) => !order.cancelledAt);
  if (live.length === 0) return duplicates;

  const times = live.map((order) => order.createdAt.getTime());
  const others = await prisma.order.findMany({
    where: {
      customerId: { in: [...new Set(live.map((order) => order.customerId))] },
      cancelledAt: null,
      createdAt: {
        gt: new Date(Math.min(...times) - DUPLICATE_WINDOW_MS),
        lt: new Date(Math.max(...times) + DUPLICATE_WINDOW_MS),
      },
    },
    orderBy: { id: "asc" },
    select: { reference: true, customerId: true, createdAt: true },
  });

  for (const order of live) {
    let nearest: { gap: number; reference: string } | null = null;
    for (const other of others) {
      if (
        other.reference === order.reference ||
        other.customerId !== order.customerId
      ) {
        continue;
      }
      const gap = Math.abs(
        other.createdAt.getTime() - order.createdAt.getTime(),
      );
      if (gap < DUPLICATE_WINDOW_MS && (!nearest || gap < nearest.gap)) {
        nearest = { gap, reference: other.reference };
      }
    }
    if (nearest) duplicates.set(order.reference, nearest.reference);
  }
  return duplicates;
}

const ORDER_DETAIL = {
  reference: true,
  customerId: true,
  createdAt: true,
  sentAt: true,
  paidAt: true,
  cancelledAt: true,
  collectedAt: true,
  withdrawnAt: true,
  withdrawalName: true,
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
      confirmedAt: true,
      withdrawnAt: true,
      createdAt: true,
    },
  },
  events: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      kind: true,
      adminEmail: true,
      emailStatus: true,
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
