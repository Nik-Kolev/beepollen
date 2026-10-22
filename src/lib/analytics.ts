import { calendarDaysSince } from "@/lib/admin-orders";
import prisma from "@/lib/prisma";

export const PERIODS = ["week", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  week: "Последните 7 дни",
  month: "Последните 30 дни",
  all: "Общо",
};

const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  month: 30,
  all: Infinity,
};

export const TRAFFIC_SOURCES = [
  "google",
  "facebook",
  "instagram",
  "tiktok",
  "direct",
  "other",
] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const TRAFFIC_SOURCE_LABEL: Record<TrafficSource, string> = {
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  direct: "Директно",
  other: "Други",
};

export type VisitorStats = {
  visitors: number;
  sources: Record<TrafficSource, number>;
};

export const TODO_VISITORS: Record<Period, VisitorStats> = {
  week: {
    visitors: 143,
    sources: {
      google: 61,
      facebook: 38,
      instagram: 22,
      tiktok: 9,
      direct: 11,
      other: 2,
    },
  },
  month: {
    visitors: 587,
    sources: {
      google: 236,
      facebook: 171,
      instagram: 84,
      tiktok: 41,
      direct: 47,
      other: 8,
    },
  },
  all: {
    visitors: 1924,
    sources: {
      google: 802,
      facebook: 519,
      instagram: 263,
      tiktok: 118,
      direct: 197,
      other: 25,
    },
  },
};

export function visitorStats(): Record<Period, VisitorStats> {
  return TODO_VISITORS;
}

export async function countSubscribers(
  now: Date,
): Promise<Record<Period, number>> {
  const consents = await prisma.consent.findMany({
    where: { kind: "OFFERS", confirmedAt: { not: null }, withdrawnAt: null },
    select: { confirmedAt: true, order: { select: { customerId: true } } },
    orderBy: { confirmedAt: "asc" },
  });

  const firstByCustomer = new Map<number, Date>();
  for (const { confirmedAt, order } of consents) {
    if (confirmedAt && !firstByCustomer.has(order.customerId)) {
      firstByCustomer.set(order.customerId, confirmedAt);
    }
  }

  const counts = { week: 0, month: 0, all: 0 };
  for (const first of firstByCustomer.values()) {
    const days = calendarDaysSince(first, now);
    for (const period of PERIODS) {
      if (days < PERIOD_DAYS[period]) counts[period] += 1;
    }
  }
  return counts;
}
