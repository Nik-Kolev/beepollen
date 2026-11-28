import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  classifySource,
  rankedSources,
  readVisitorStats,
  type Report,
  type ReportRequest,
  reportRanges,
} from "@/lib/analytics";
import { CACHE_TTL_MS, createVisitorReporter, visitorReport } from "@/lib/ga4";
import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

const TODAY = "2026-11-16";

test("before launch the ranges end today and the total reaches back to GA4's first day", () => {
  assert.deepEqual(reportRanges(TODAY, null), [
    { name: "week", startDate: "2026-11-10", endDate: TODAY },
    { name: "month", startDate: "2026-10-18", endDate: TODAY },
    { name: "all", startDate: "2015-08-14", endDate: TODAY },
  ]);
});

test("a week and a month reach across a month and a year boundary", () => {
  assert.deepEqual(
    reportRanges("2027-01-03", null).map((range) => range.startDate),
    ["2026-12-28", "2026-12-05", "2015-08-14"],
  );
});

test("no range starts before the launch date", () => {
  assert.deepEqual(reportRanges(TODAY, "2026-11-12"), [
    { name: "week", startDate: "2026-11-12", endDate: TODAY },
    { name: "month", startDate: "2026-11-12", endDate: TODAY },
    { name: "all", startDate: "2026-11-12", endDate: TODAY },
  ]);
});

test("a launch date older than the period leaves the period whole", () => {
  assert.deepEqual(
    reportRanges(TODAY, "2026-11-01").map((range) => range.startDate),
    ["2026-11-10", "2026-11-01", "2026-11-01"],
  );
});

test("a launch date still ahead asks GA nothing and reports zero", async () => {
  const stats = await readVisitorStats(
    () => assert.fail("GA4 was asked for a range that has not begun"),
    TODAY,
    "2026-11-20",
  );

  for (const period of ["week", "month", "all"] as const) {
    assert.equal(stats[period].visitors, 0);
    assert.equal(
      Object.values(stats[period].sources).reduce((a, b) => a + b, 0),
      0,
    );
  }
});

const SOURCES: [string, ReturnType<typeof classifySource>][] = [
  ["google", "google"],
  ["www.google.bg", "google"],
  ["google.com", "google"],
  ["mail.google.com", "other"],
  ["facebook.com", "facebook"],
  ["m.facebook.com", "facebook"],
  ["l.facebook.com", "facebook"],
  ["fb", "facebook"],
  ["instagram.com", "instagram"],
  ["l.instagram.com", "instagram"],
  ["ig", "instagram"],
  ["tiktok.com", "tiktok"],
  ["(direct)", "direct"],
  ["bing", "other"],
  ["(not set)", "other"],
  ["", "other"],
];

for (const [source, expected] of SOURCES) {
  test(`source "${source}" counts as ${expected}`, () => {
    assert.equal(classifySource(source), expected);
  });
}

function row(values: string[], count: number) {
  return {
    dimensionValues: values.map((value) => ({ value })),
    metricValues: [{ value: String(count) }],
  };
}

function fakeGa(sourceHeaders: string[], sourceRows: Report["rows"]) {
  const requests: ReportRequest[] = [];
  const runReport = async (request: ReportRequest): Promise<Report> => {
    requests.push(request);
    if (request.dimensions.length === 0) {
      return {
        dimensionHeaders: [{ name: "dateRange" }],
        rows: [row(["week"], 12), row(["all"], 340)],
      };
    }
    return {
      dimensionHeaders: sourceHeaders.map((name) => ({ name })),
      rows: sourceRows,
    };
  };
  return { requests, runReport };
}

test("GA's rows become each period's visitors and grouped sources", async () => {
  const { requests, runReport } = fakeGa(
    ["sessionSource", "dateRange"],
    [
      row(["google", "week"], 5),
      row(["www.google.bg", "week"], 2),
      row(["m.facebook.com", "week"], 3),
      row(["l.facebook.com", "week"], 1),
      row(["(direct)", "week"], 4),
      row(["bing", "all"], 7),
      row(["google", "all"], 200),
    ],
  );

  const stats = await readVisitorStats(runReport, TODAY, null);

  assert.equal(stats.week.visitors, 12);
  assert.equal(stats.month.visitors, 0);
  assert.equal(stats.all.visitors, 340);
  assert.deepEqual(stats.week.sources, {
    google: 7,
    facebook: 4,
    instagram: 0,
    tiktok: 0,
    direct: 4,
    other: 0,
  });
  assert.equal(stats.all.sources.google, 200);
  assert.equal(stats.all.sources.other, 7);
  assert.equal(stats.month.sources.google, 0);

  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.deepEqual(request.dateRanges, reportRanges(TODAY, null));
  }
});

test("visitors are counted as users, and sources as visits so their shares add up", async () => {
  const { requests, runReport } = fakeGa(["sessionSource", "dateRange"], []);

  await readVisitorStats(runReport, TODAY, null);

  const totals = requests.find((r) => r.dimensions.length === 0);
  const sources = requests.find((r) => r.dimensions.length > 0);
  assert.deepEqual(totals?.metrics, [{ name: "activeUsers" }]);
  assert.deepEqual(sources?.dimensions, [{ name: "sessionSource" }]);
  assert.deepEqual(sources?.metrics, [{ name: "sessions" }]);
});

test("the columns are found by name, whatever order GA returns them in", async () => {
  const { runReport } = fakeGa(
    ["dateRange", "sessionSource"],
    [row(["month", "instagram.com"], 9)],
  );

  const stats = await readVisitorStats(runReport, TODAY, null);

  assert.equal(stats.month.sources.instagram, 9);
  assert.equal(stats.month.sources.other, 0);
});

test("a report without the dateRange column is refused rather than miscounted", async () => {
  const { runReport } = fakeGa(["sessionSource"], [row(["google"], 9)]);

  await assert.rejects(
    readVisitorStats(runReport, TODAY, null),
    /no dateRange dimension/,
  );
});

test("sources are ranked from most visits to fewest", () => {
  const ranked = rankedSources({
    visitors: 10,
    sources: {
      google: 2,
      facebook: 5,
      instagram: 0,
      tiktok: 1,
      direct: 9,
      other: 3,
    },
  });

  assert.deepEqual(
    ranked.map((entry) => entry.source),
    ["direct", "facebook", "other", "google", "tiktok", "instagram"],
  );
});

function withEnv(values: Record<string, string | undefined>) {
  const saved = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("without a property id or a key the report says GA is not connected", async () => {
  for (const env of [
    { GA_PROPERTY_ID: undefined, GA_SERVICE_ACCOUNT_KEY: "a2V5" },
    { GA_PROPERTY_ID: "123456", GA_SERVICE_ACCOUNT_KEY: " " },
  ]) {
    const restore = withEnv(env);
    try {
      assert.deepEqual(await visitorReport(), { status: "unconfigured" });
    } finally {
      restore();
    }
  }
});

test("a key that is not a service account's JSON fails the report instead of throwing", async () => {
  const restore = withEnv({
    GA_PROPERTY_ID: "123456",
    GA_SERVICE_ACCOUNT_KEY: Buffer.from('{"type":"other"}').toString("base64"),
  });
  const logged = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await visitorReport(), { status: "failed" });
  } finally {
    console.error = logged;
    restore();
  }
});

function countingGa(failures = 0) {
  const counts = { opened: 0, requests: 0 };
  let failing = failures;
  const open = async () => {
    counts.opened += 1;
    return async (request: ReportRequest): Promise<Report> => {
      counts.requests += 1;
      if (failing > 0) {
        failing -= 1;
        throw new Error("GA4 is down");
      }
      return {
        dimensionHeaders: [
          ...request.dimensions.map(({ name }) => ({ name })),
          { name: "dateRange" },
        ],
        rows: [],
      };
    };
  };
  return { counts, open };
}

function silenced<T>(act: () => Promise<T>) {
  const logged = console.error;
  console.error = () => {};
  return act().finally(() => {
    console.error = logged;
  });
}

const NOON = new Date("2026-11-16T10:00:00Z");

test("a second look within ten minutes reuses the report", async () => {
  const { counts, open } = countingGa();
  const report = createVisitorReporter(open, null);

  await report(NOON);
  await report(new Date(NOON.getTime() + CACHE_TTL_MS - 1));

  assert.deepEqual(counts, { opened: 1, requests: 2 });
});

test("a look ten minutes later asks GA again on the same connection", async () => {
  const { counts, open } = countingGa();
  const report = createVisitorReporter(open, null);

  await report(NOON);
  await report(new Date(NOON.getTime() + CACHE_TTL_MS));

  assert.deepEqual(counts, { opened: 1, requests: 4 });
});

test("a new Sofia day asks GA again even within ten minutes", async () => {
  const { counts, open } = countingGa();
  const report = createVisitorReporter(open, null);

  await report(new Date("2026-11-16T21:58:00Z"));
  await report(new Date("2026-11-16T22:02:00Z"));

  assert.deepEqual(counts, { opened: 1, requests: 4 });
});

test("a failed report is not kept and the next look connects afresh", async () => {
  const { counts, open } = countingGa(1);
  const report = createVisitorReporter(open, null);

  const first = await silenced(() => report(NOON));
  const second = await report(NOON);

  assert.deepEqual(first, { status: "failed" });
  assert.equal(second.status, "ok");
  assert.equal(counts.opened, 2);
});

test("the report is marked pre-launch only while no launch date is set", async () => {
  const before = await createVisitorReporter(countingGa().open, null)(NOON);
  const afterLaunch = await createVisitorReporter(
    countingGa().open,
    "2026-11-01",
  )(NOON);

  assert.equal(before.status, "ok");
  assert.equal(afterLaunch.status, "ok");
  assert.equal(before.status === "ok" && before.preLaunch, true);
  assert.equal(afterLaunch.status === "ok" && afterLaunch.preLaunch, false);
});

test("a corrupted key never reaches the log", async () => {
  const fragment = "PRIVATE-KEY-FRAGMENT-7731";
  const restore = withEnv({
    GA_PROPERTY_ID: "123456",
    GA_SERVICE_ACCOUNT_KEY: Buffer.from(
      `{"client_email":"a@b.c","private_key":${fragment}"}`,
    ).toString("base64"),
  });
  const lines: string[] = [];
  const logged = console.error;
  console.error = (...args: unknown[]) => {
    for (const arg of args) {
      lines.push(
        arg instanceof Error ? `${arg.message}\n${arg.stack}` : String(arg),
      );
    }
  };
  try {
    assert.deepEqual(await visitorReport(), { status: "failed" });
  } finally {
    console.error = logged;
    restore();
  }

  assert.ok(lines.length > 0);
  assert.ok(
    lines.every((line) => !line.includes(fragment.slice(0, 8))),
    lines.join("\n"),
  );
});
