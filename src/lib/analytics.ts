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

export type ReportRange = { name: Period; startDate: string; endDate: string };

export type ReportRow = {
  dimensionValues?: { value?: string | null }[] | null;
  metricValues?: { value?: string | null }[] | null;
};

export type Report = {
  dimensionHeaders?: { name?: string | null }[] | null;
  rows?: ReportRow[] | null;
};

export type ReportRequest = {
  dateRanges: ReportRange[];
  dimensions: { name: string }[];
  metrics: { name: string }[];
  limit?: string;
};

export type RunReport = (request: ReportRequest) => Promise<Report>;

const GA4_EARLIEST_DATE = "2015-08-14";

function daysBefore(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function reportRanges(
  today: string,
  launchDate: string | null,
): ReportRange[] {
  const floor = launchDate ?? GA4_EARLIEST_DATE;
  return PERIODS.map((name) => {
    const days = PERIOD_DAYS[name];
    const start = Number.isFinite(days) ? daysBefore(today, days - 1) : floor;
    return {
      name,
      startDate: start < floor ? floor : start,
      endDate: today,
    };
  }).filter((range) => range.startDate <= range.endDate);
}

const GOOGLE_HOST = /^(www\.)?google\.[a-z.]+$/;

export function classifySource(source: string): TrafficSource {
  const value = source.trim().toLowerCase();
  if (value === "(direct)") return "direct";
  if (value === "google" || GOOGLE_HOST.test(value)) return "google";
  if (value === "fb" || value.includes("facebook")) return "facebook";
  if (value === "ig" || value.includes("instagram")) return "instagram";
  if (value.includes("tiktok")) return "tiktok";
  return "other";
}

function emptyStats(): VisitorStats {
  return {
    visitors: 0,
    sources: Object.fromEntries(
      TRAFFIC_SOURCES.map((source) => [source, 0]),
    ) as Record<TrafficSource, number>,
  };
}

function column(report: Report, name: string) {
  const index = (report.dimensionHeaders ?? []).findIndex(
    (header) => header.name === name,
  );
  if (index < 0) throw new Error(`GA4 report has no ${name} dimension`);
  return index;
}

function rowPeriod(row: ReportRow, index: number): Period | null {
  const value = row.dimensionValues?.[index]?.value;
  return PERIODS.find((period) => period === value) ?? null;
}

function rowCount(row: ReportRow) {
  const count = Number(row.metricValues?.[0]?.value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function readVisitorStats(
  runReport: RunReport,
  today: string,
  launchDate: string | null,
): Promise<Record<Period, VisitorStats>> {
  const stats = {
    week: emptyStats(),
    month: emptyStats(),
    all: emptyStats(),
  };
  const dateRanges = reportRanges(today, launchDate);
  if (dateRanges.length === 0) return stats;

  const metrics = [{ name: "activeUsers" }];
  const [totals, sources] = await Promise.all([
    runReport({ dateRanges, dimensions: [], metrics }),
    runReport({
      dateRanges,
      dimensions: [{ name: "sessionSource" }],
      metrics,
      limit: "1000",
    }),
  ]);

  const totalPeriod = column(totals, "dateRange");
  for (const row of totals.rows ?? []) {
    const period = rowPeriod(row, totalPeriod);
    if (period) stats[period].visitors += rowCount(row);
  }

  const sourcePeriod = column(sources, "dateRange");
  const sourceName = column(sources, "sessionSource");
  for (const row of sources.rows ?? []) {
    const period = rowPeriod(row, sourcePeriod);
    const source = row.dimensionValues?.[sourceName]?.value ?? "";
    if (period) stats[period].sources[classifySource(source)] += rowCount(row);
  }

  return stats;
}

export function rankedSources(stats: VisitorStats) {
  return TRAFFIC_SOURCES.map((source) => ({
    source,
    visitors: stats.sources[source],
  })).sort((a, b) => b.visitors - a.visitors);
}

export async function countSubscribers(
  now: Date,
): Promise<Record<Period, number>> {
  const consents = await prisma.consent.findMany({
    where: { kind: "OFFERS", withdrawnAt: null },
    select: { createdAt: true, order: { select: { customerId: true } } },
    orderBy: { createdAt: "asc" },
  });

  const firstByCustomer = new Map<number, Date>();
  for (const { createdAt, order } of consents) {
    if (!firstByCustomer.has(order.customerId)) {
      firstByCustomer.set(order.customerId, createdAt);
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
