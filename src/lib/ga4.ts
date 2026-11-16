import { z } from "zod";

import {
  type Period,
  readVisitorStats,
  type RunReport,
  type VisitorStats,
} from "@/lib/analytics";
import { sofiaToday } from "@/lib/promotions";
import { LAUNCH_DATE } from "@/lib/site";

export type VisitorReport =
  | { status: "ok"; stats: Record<Period, VisitorStats>; preLaunch: boolean }
  | { status: "unconfigured" }
  | { status: "failed" };

export const CACHE_TTL_MS = 10 * 60 * 1000;

const ServiceAccountKey = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
});

function decodeKey(encodedKey: string) {
  try {
    return ServiceAccountKey.parse(
      JSON.parse(Buffer.from(encodedKey, "base64").toString("utf8")),
    );
  } catch {
    throw new Error(
      "GA_SERVICE_ACCOUNT_KEY is not a base64 service account JSON key",
    );
  }
}

async function connect(
  propertyId: string,
  encodedKey: string,
): Promise<RunReport> {
  const key = decodeKey(encodedKey);
  const [{ BetaAnalyticsDataClient }, { JWT }] = await Promise.all([
    import("@google-analytics/data"),
    import("google-auth-library"),
  ]);
  const authClient = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const client = new BetaAnalyticsDataClient({ authClient, fallback: true });
  const property = `properties/${propertyId}`;
  return async (request) => {
    const [response] = await client.runReport({ property, ...request });
    return response;
  };
}

export function createVisitorReporter(
  open: () => Promise<RunReport>,
  launchDate: string | null,
) {
  let cached: { day: string; at: number; report: VisitorReport } | null = null;
  let runReport: RunReport | null = null;

  return async (now: Date): Promise<VisitorReport> => {
    const day = sofiaToday(now);
    if (
      cached &&
      cached.day === day &&
      now.getTime() - cached.at < CACHE_TTL_MS
    ) {
      return cached.report;
    }

    try {
      runReport ??= await open();
      const stats = await readVisitorStats(runReport, day, launchDate);
      const report: VisitorReport = {
        status: "ok",
        stats,
        preLaunch: launchDate === null,
      };
      cached = { day, at: now.getTime(), report };
      return report;
    } catch (error) {
      runReport = null;
      console.error("GA4 report failed", error);
      return { status: "failed" };
    }
  };
}

const reportVisitors = createVisitorReporter(
  () =>
    connect(
      process.env.GA_PROPERTY_ID?.trim() ?? "",
      process.env.GA_SERVICE_ACCOUNT_KEY?.trim() ?? "",
    ),
  LAUNCH_DATE,
);

export async function visitorReport(now = new Date()): Promise<VisitorReport> {
  if (
    !process.env.GA_PROPERTY_ID?.trim() ||
    !process.env.GA_SERVICE_ACCOUNT_KEY?.trim()
  ) {
    return { status: "unconfigured" };
  }
  return reportVisitors(now);
}
