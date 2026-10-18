import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  applyOrderStep,
  calendarDaysSince,
  countOrdersByView,
  daysAgoLabel,
  deliveryLabel,
  formatOrderTime,
  listOrders,
  nextOrderSteps,
  ORDER_FILTERS,
  orderListHref,
  ORDERS_STEP,
  orderStatus,
  type OrderStatus,
  type OrderStep,
  orderStepInput,
  orderView,
  parseHideClosed,
  parseOrderFilter,
  parseOrderShown,
  undoTarget,
} from "@/lib/admin-orders";
import { CONSENT_WORDING } from "@/lib/consent";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { TEST_OFFICE_SNAPSHOT, validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const LOCAL = { deliveryMethod: "LOCAL", officeCode: "" };

async function place(
  overrides: Record<string, unknown> = {},
  ipAddress: string | null = null,
) {
  const result = await placeOrder(validCheckoutInput(overrides), ipAddress);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("order was refused");
  return result.order;
}

async function read(reference: string) {
  return prisma.order.findUniqueOrThrow({ where: { reference } });
}

async function step(reference: string, ...steps: OrderStep[]) {
  for (const next of steps) {
    const status = orderStatus(await read(reference));
    assert.deepEqual(
      await applyOrderStep(reference, next, status),
      { ok: true },
      `${status} → ${next}`,
    );
  }
}

async function placedIn(status: OrderStatus, overrides = {}) {
  const { reference } = await place(overrides);
  const path: Record<OrderStatus, OrderStep[]> = {
    new: [],
    sent: ["send"],
    paid: "deliveryMethod" in overrides ? ["handOver"] : ["send", "pay"],
    returned: ["send", "return"],
    collected: ["send", "return", "collect"],
    cancelled: ["cancel"],
  };
  await step(reference, ...path[status]);
  return reference;
}

const FILTER_OF: Record<OrderStatus, (typeof ORDER_FILTERS)[number]> = {
  new: "new",
  sent: "sent",
  paid: "paid",
  returned: "returned",
  collected: "cancelled",
  cancelled: "cancelled",
};

test("the full list shows the newest order first", async () => {
  const older = await place();
  const newer = await place();

  const references = (await listOrders("all")).map((order) => order.reference);

  assert.equal(references[0], newer.reference);
  assert.ok(
    references.indexOf(newer.reference) < references.indexOf(older.reference),
  );
});

test("a listed order carries its lines, snapshot contact, email, office and consents", async () => {
  const placed = await place(
    {
      name: "Мария Петрова",
      phone: "0888111222",
      email: "Maria@Example.com",
      acceptsOffers: true,
      items: [
        { slug: "pchelen-prashets-500g", quantity: 2 },
        { slug: "pchelen-prashets-1kg", quantity: 1 },
      ],
    },
    "203.0.113.7",
  );

  const order = (await listOrders("all", 9999)).find(
    (listed) => listed.reference === placed.reference,
  );

  assert.ok(order);
  assert.equal(order.contactName, "Мария Петрова");
  assert.equal(order.contactPhone, "+359888111222");
  assert.equal(order.customer.email, "maria@example.com");
  assert.equal(order.officeCode, TEST_OFFICE_SNAPSHOT.officeCode);
  assert.equal(order.officeCity, TEST_OFFICE_SNAPSHOT.officeCity);
  assert.equal(order.totalCents, placed.totalCents);
  assert.deepEqual(
    order.items.map(({ name, quantity }) => ({ name, quantity })),
    [
      { name: "Пчелен прашец 500 г", quantity: 2 },
      { name: "Пчелен прашец 1 кг", quantity: 1 },
    ],
  );
  assert.deepEqual(
    order.consents.map(({ kind, wording, ipAddress }) => ({
      kind,
      wording,
      ipAddress,
    })),
    [
      {
        kind: "OFFERS",
        wording: CONSENT_WORDING.OFFERS,
        ipAddress: "203.0.113.7",
      },
      {
        kind: "TERMS",
        wording: CONSENT_WORDING.TERMS,
        ipAddress: "203.0.113.7",
      },
    ],
  );
});

test("labels a Popovo order as hand delivery and an Econt order by its office city", async () => {
  const local = await place(LOCAL);
  const econt = await place();

  const listed = await listOrders("all", 9999);
  const find = (reference: string) =>
    listed.find((order) => order.reference === reference);
  const localListed = find(local.reference);
  const econtListed = find(econt.reference);

  assert.ok(localListed && econtListed);
  assert.equal(deliveryLabel(localListed), "Попово — на ръка");
  assert.equal(deliveryLabel(econtListed), TEST_OFFICE_SNAPSHOT.officeCity);
});

test("a new Econt order offers sending or cancelling; a Popovo one offers hand-over", async () => {
  const econt = await read((await place()).reference);
  const local = await read((await place(LOCAL)).reference);

  assert.equal(orderStatus(econt), "new");
  assert.deepEqual(nextOrderSteps(econt), ["send", "cancel"]);
  assert.deepEqual(nextOrderSteps(local), ["handOver", "cancel"]);
});

test("an Econt order is sent, then paid, each step stamping only its own time", async () => {
  const { reference } = await place();

  await step(reference, "send");
  const sent = await read(reference);
  assert.equal(orderStatus(sent), "sent");
  assert.ok(sent.sentAt instanceof Date);
  assert.equal(sent.paidAt, null);
  assert.deepEqual(nextOrderSteps(sent), ["pay", "return"]);

  await step(reference, "pay");
  const paid = await read(reference);
  assert.equal(orderStatus(paid), "paid");
  assert.equal(paid.sentAt?.getTime(), sent.sentAt.getTime());
  assert.ok(paid.paidAt instanceof Date);
  assert.deepEqual(nextOrderSteps(paid), []);
});

test("a Popovo hand-over marks the order sent and paid at once", async () => {
  const { reference } = await place(LOCAL);

  await step(reference, "handOver");
  const order = await read(reference);

  assert.equal(orderStatus(order), "paid");
  assert.ok(order.sentAt && order.paidAt);
});

test("a sent order the buyer did not collect is returned, then collected back", async () => {
  const { reference } = await place();

  await step(reference, "send", "return");
  const returned = await read(reference);
  assert.equal(orderStatus(returned), "returned");
  assert.deepEqual(nextOrderSteps(returned), ["collect"]);

  await step(reference, "collect");
  const collected = await read(reference);
  assert.equal(orderStatus(collected), "collected");
  assert.ok(collected.collectedAt instanceof Date);
  assert.deepEqual(nextOrderSteps(collected), []);
});

test("an order cancelled before sending has nothing further to do", async () => {
  const reference = await placedIn("cancelled");
  const order = await read(reference);

  assert.equal(orderStatus(order), "cancelled");
  assert.deepEqual(nextOrderSteps(order), []);
});

test("a step the order's status does not allow is refused and changes nothing", async () => {
  const cases: [OrderStatus, OrderStep, object?][] = [
    ["new", "pay"],
    ["new", "return"],
    ["new", "collect"],
    ["new", "handOver"],
    ["new", "undo"],
    ["new", "send", LOCAL],
    ["sent", "send"],
    ["sent", "cancel"],
    ["sent", "collect"],
    ["sent", "handOver"],
    ["paid", "pay"],
    ["paid", "return"],
    ["paid", "cancel"],
    ["paid", "collect"],
    ["returned", "pay"],
    ["returned", "send"],
    ["returned", "return"],
    ["collected", "collect"],
    ["collected", "pay"],
    ["cancelled", "send"],
    ["cancelled", "pay"],
    ["cancelled", "cancel"],
  ];

  const placed = new Map<string, string>();
  for (const [status, refused, overrides] of cases) {
    const key = `${status}${overrides ? "-local" : ""}`;
    if (!placed.has(key)) placed.set(key, await placedIn(status, overrides));
    const reference = placed.get(key)!;
    const before = await read(reference);

    assert.deepEqual(
      await applyOrderStep(reference, refused, status),
      { ok: false, reason: "refused" },
      `${status} → ${refused}`,
    );
    assert.deepEqual(await read(reference), before);
  }
});

test("a step sent from a view of an older status is refused as stale and changes nothing", async () => {
  const reference = await placedIn("paid");
  const before = await read(reference);

  assert.deepEqual(await applyOrderStep(reference, "undo", "sent"), {
    ok: false,
    reason: "stale",
  });
  assert.deepEqual(await applyOrderStep(reference, "send", "new"), {
    ok: false,
    reason: "stale",
  });
  assert.deepEqual(await read(reference), before);
});

test("an order the buyer withdrew is not sent or handed over until the owner confirms it", async () => {
  const econt = await place();
  const local = await place(LOCAL);
  const withdrawnAt = new Date("2026-10-18T09:30:00Z");

  for (const [reference, dispatch] of [
    [econt.reference, "send"],
    [local.reference, "handOver"],
  ] as const) {
    await prisma.order.update({ where: { reference }, data: { withdrawnAt } });
    const before = await read(reference);

    assert.deepEqual(
      await applyOrderStep(reference, dispatch, "new"),
      { ok: false, reason: "withdrawn" },
      dispatch,
    );
    assert.deepEqual(await read(reference), before, dispatch);

    assert.deepEqual(
      await applyOrderStep(reference, dispatch, "new", new Date(), true),
      { ok: true },
      dispatch,
    );
    assert.notEqual((await read(reference)).sentAt, null, dispatch);
  }
});

test("a withdrawn order can still be cancelled without a confirmation of the withdrawal", async () => {
  const { reference } = await place();
  await prisma.order.update({
    where: { reference },
    data: { withdrawnAt: new Date("2026-10-18T09:30:00Z") },
  });

  assert.deepEqual(await applyOrderStep(reference, "cancel", "new"), {
    ok: true,
  });
});

test("the action's input accepts the confirmation flag and nothing but a boolean", () => {
  const base = { reference: "BP1810261", step: "send", expected: "new" };

  assert.equal(orderStepInput.safeParse(base).success, true);
  assert.equal(
    orderStepInput.safeParse({ ...base, confirmed: true }).success,
    true,
  );
  assert.equal(
    orderStepInput.safeParse({ ...base, confirmed: "true" }).success,
    false,
  );
});

test("two screens undoing the same paid order take back only one step", async () => {
  const reference = await placedIn("paid");

  const results = await Promise.all([
    applyOrderStep(reference, "undo", "paid"),
    applyOrderStep(reference, "undo", "paid"),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(orderStatus(await read(reference)), "sent");
});

test("undo takes back only the last step", async () => {
  const econt = await placedIn("paid");
  const local = await place(LOCAL);
  const returned = await placedIn("collected");
  const cancelled = await placedIn("cancelled");

  await step(econt, "undo");
  assert.equal(orderStatus(await read(econt)), "sent");
  await step(econt, "undo");
  assert.equal(orderStatus(await read(econt)), "new");

  await step(local.reference, "handOver", "undo");
  const localBack = await read(local.reference);
  assert.equal(orderStatus(localBack), "new");
  assert.equal(localBack.sentAt, null);

  await step(returned, "undo");
  assert.equal(orderStatus(await read(returned)), "returned");
  await step(returned, "undo");
  assert.equal(orderStatus(await read(returned)), "sent");

  await step(cancelled, "undo");
  assert.equal(orderStatus(await read(cancelled)), "new");
});

test("undo lands on exactly the status the confirmation names, however old the step", async () => {
  const cases: [OrderStatus, OrderStatus | null, object?][] = [
    ["new", null],
    ["sent", "new"],
    ["paid", "sent"],
    ["paid", "new", LOCAL],
    ["returned", "sent"],
    ["collected", "returned"],
    ["cancelled", "new"],
  ];

  for (const [status, target, overrides] of cases) {
    const reference = await placedIn(status, overrides);
    const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    assert.equal(undoTarget(await read(reference)), target, status);
    if (!target) continue;

    assert.deepEqual(
      await applyOrderStep(reference, "undo", status, monthLater),
      { ok: true },
      status,
    );
    assert.equal(orderStatus(await read(reference)), target, status);
  }
});

test("a step on an unknown reference is refused and does not throw", async () => {
  assert.deepEqual(await applyOrderStep("BP000000", "send", "new"), {
    ok: false,
    reason: "refused",
  });
});

test("every order appears in exactly the filter its status names, and in the open view only while open", async () => {
  for (const status of [
    "new",
    "sent",
    "paid",
    "returned",
    "collected",
    "cancelled",
  ] as const) {
    await placedIn(status);
  }

  const views = [...ORDER_FILTERS, "open"] as const;
  const members = new Map<string, Set<string>>();
  for (const view of views) {
    members.set(
      view,
      new Set((await listOrders(view, 9999)).map((order) => order.reference)),
    );
  }

  for (const order of await listOrders("all", 9999)) {
    const status = orderStatus(order);
    const open = ["new", "sent", "returned"].includes(status);
    for (const view of views) {
      const expected =
        view === "all" ||
        view === FILTER_OF[status] ||
        (view === "open" && open);
      assert.equal(
        members.get(view)!.has(order.reference),
        expected,
        `${order.reference} (${status}) in ${view}`,
      );
    }
  }
});

test("hiding closed orders lists only the open ones, newest first", async () => {
  await placedIn("returned");
  await placedIn("paid");
  await placedIn("new");
  await placedIn("cancelled");
  await placedIn("sent");

  const listed = await listOrders(orderView("all", true), 9999);
  const times = listed.map((order) => order.createdAt.getTime());

  assert.ok(listed.length > 0);
  for (const order of listed) {
    assert.ok(
      ["new", "sent", "returned"].includes(orderStatus(order)),
      order.reference,
    );
  }
  assert.deepEqual(
    times,
    [...times].sort((a, b) => b - a),
  );
});

test("the closed-orders switch applies to the full list only", () => {
  assert.equal(orderView("all", true), "open");
  assert.equal(orderView("all", false), "all");
  assert.equal(orderView("sent", true), "sent");
  assert.equal(parseHideClosed("1"), true);
  for (const crafted of ["0", "true", "", undefined, ["1"]]) {
    assert.equal(parseHideClosed(crafted), false, JSON.stringify(crafted));
  }
});

test("each view's count matches the orders it lists when all are shown", async () => {
  const counts = await countOrdersByView();

  for (const view of [...ORDER_FILTERS, "open"] as const) {
    const shown = parseOrderShown(String(counts[view]), counts[view]);
    assert.equal(counts[view], (await listOrders(view, shown)).length);
  }
});

test("the full list shows the newest orders first, and showing more extends it without reordering", async () => {
  const { all } = await countOrdersByView();
  for (let i = all; i <= ORDERS_STEP * 2; i++) await place();

  const first = await listOrders("all", ORDERS_STEP);
  const more = await listOrders("all", ORDERS_STEP * 2);

  assert.equal(first.length, ORDERS_STEP);
  assert.equal(more.length, ORDERS_STEP * 2);
  assert.deepEqual(
    first.map((order) => order.reference),
    more.slice(0, ORDERS_STEP).map((order) => order.reference),
  );
  const times = more.map((order) => order.createdAt.getTime());
  assert.deepEqual(
    times,
    [...times].sort((a, b) => b - a),
  );
});

test("the shown count starts at one step, never drops below it and never passes the total", () => {
  assert.equal(parseOrderShown("10", 23), 10);
  assert.equal(parseOrderShown("23", 23), 23);
  assert.equal(parseOrderShown("100", 23), 23);
  assert.equal(parseOrderShown("2", 23), ORDERS_STEP);
  assert.equal(parseOrderShown("100", 2), ORDERS_STEP);
  for (const crafted of [
    "0",
    "-1",
    "1.5",
    "010",
    "10abc",
    " 10",
    "",
    undefined,
    ["10"],
  ]) {
    assert.equal(
      parseOrderShown(crafted, 23),
      ORDERS_STEP,
      JSON.stringify(crafted),
    );
  }
});

test("a list link keeps the filter and leaves the default filter and first step out of the address", () => {
  assert.equal(orderListHref("all", ORDERS_STEP), "/admin/orders");
  assert.equal(orderListHref("all", 10), "/admin/orders?shown=10");
  assert.equal(orderListHref("all", ORDERS_STEP, true), "/admin/orders?open=1");
  assert.equal(orderListHref("all", 10, true), "/admin/orders?open=1&shown=10");
  assert.equal(
    orderListHref("sent", 15, true),
    "/admin/orders?filter=sent&shown=15",
  );
});

test("a step request is accepted only with a known step, a known status and a bounded reference", () => {
  const valid = { reference: "BP2809261", step: "pay", expected: "sent" };

  assert.equal(orderStepInput.safeParse(valid).success, true);
  for (const crafted of [
    { ...valid, step: "shipped" },
    { ...valid, step: "paidAt" },
    { ...valid, step: ["pay"] },
    { ...valid, expected: "done" },
    { reference: valid.reference, step: valid.step },
    { ...valid, reference: "" },
    { ...valid, reference: "B".repeat(33) },
    { ...valid, reference: { not: null } },
    null,
  ]) {
    assert.equal(
      orderStepInput.safeParse(crafted).success,
      false,
      JSON.stringify(crafted),
    );
  }
});

test("an unknown or missing filter falls back to the full list", () => {
  assert.equal(parseOrderFilter("returned"), "returned");
  assert.equal(parseOrderFilter("action"), "all");
  assert.equal(parseOrderFilter("open"), "all");
  assert.equal(parseOrderFilter(undefined), "all");
  assert.equal(parseOrderFilter(["new"]), "all");
});

test("days are counted by the Sofia calendar date, not by 24-hour periods", () => {
  const lateEvening = new Date("2026-10-11T20:59:00Z");
  const justAfterMidnight = new Date("2026-10-11T21:01:00Z");

  assert.equal(calendarDaysSince(lateEvening, justAfterMidnight), 1);
  assert.equal(
    calendarDaysSince(new Date("2026-10-11T05:00:00Z"), lateEvening),
    0,
  );
  assert.equal(
    calendarDaysSince(
      new Date("2026-10-24T12:00:00Z"),
      new Date("2026-10-26T12:00:00Z"),
    ),
    2,
  );

  assert.equal(
    daysAgoLabel("Изпратена", lateEvening, lateEvening),
    "Изпратена днес",
  );
  assert.equal(
    daysAgoLabel("Изпратена", lateEvening, justAfterMidnight),
    "Изпратена вчера",
  );
  assert.equal(
    daysAgoLabel(
      "Върната",
      new Date("2026-10-08T09:00:00Z"),
      new Date("2026-10-11T09:00:00Z"),
    ),
    "Върната преди 3 дни",
  );
});

test("shows an order's time in Sofia, across both sides of daylight saving", () => {
  assert.equal(
    formatOrderTime(new Date("2026-09-26T22:30:00Z")),
    "27.09.2026 г., 01:30",
  );
  assert.equal(
    formatOrderTime(new Date("2026-01-15T09:05:00Z")),
    "15.01.2026 г., 11:05",
  );
});
