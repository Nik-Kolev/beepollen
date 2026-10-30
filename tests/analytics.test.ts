import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { countSubscribers, type Period, PERIODS } from "@/lib/analytics";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

import { validCheckoutInput } from "./support/checkout";

after(async () => {
  await prisma.$disconnect();
});

const DAY = 24 * 60 * 60 * 1000;

function sofiaToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Sofia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      10,
    ),
  );
}

const NOW = sofiaToday();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const buyer = () => `subscriber-${randomUUID()}@example.com`;

async function place(
  email: string,
  acceptsOffers: boolean,
  placedAt?: Date,
  { confirmed = true } = {},
) {
  const result = await placeOrder(
    validCheckoutInput({ email, acceptsOffers }),
    null,
  );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("order was refused");
  const { reference } = result.order;
  if (placedAt) {
    await prisma.order.update({
      where: { reference },
      data: { createdAt: placedAt },
    });
    await prisma.consent.updateMany({
      where: { order: { reference } },
      data: { createdAt: placedAt },
    });
  }
  if (confirmed) {
    await prisma.consent.updateMany({
      where: { kind: "OFFERS", order: { reference } },
      data: { confirmedAt: placedAt ?? new Date() },
    });
  }
}

async function added(act: () => Promise<void>) {
  const before = await countSubscribers(NOW);
  await act();
  const later = await countSubscribers(NOW);
  return Object.fromEntries(
    PERIODS.map((period) => [period, later[period] - before[period]]),
  ) as Record<Period, number>;
}

test("a buyer who ticks offers on two orders is counted once", async () => {
  const email = buyer();

  const delta = await added(async () => {
    await place(email, true);
    await place(email, true);
  });

  assert.deepEqual(delta, { week: 1, month: 1, all: 1 });
});

test("the same address in different letter case is one subscriber", async () => {
  const email = buyer();

  const delta = await added(async () => {
    await place(email, true);
    await place(email.toUpperCase(), true);
  });

  assert.deepEqual(delta, { week: 1, month: 1, all: 1 });
});

test("an order placed without ticking offers adds no subscriber", async () => {
  const delta = await added(() => place(buyer(), false));

  assert.deepEqual(delta, { week: 0, month: 0, all: 0 });
});

test("a buyer is counted on the day of their first confirmation, not their latest", async () => {
  const email = buyer();

  const delta = await added(async () => {
    await place(email, true, daysAgo(40));
    await place(email, true);
  });

  assert.deepEqual(delta, { week: 0, month: 0, all: 1 });
});

test("the earliest confirmation counts even when the older order was recorded last", async () => {
  const email = buyer();

  const delta = await added(async () => {
    await place(email, true);
    await place(email, true, daysAgo(40));
  });

  assert.deepEqual(delta, { week: 0, month: 0, all: 1 });
});

test("a buyer is counted from their first confirmed offers, not their first order", async () => {
  const email = buyer();

  const delta = await added(async () => {
    await place(email, false, daysAgo(40));
    await place(email, true);
  });

  assert.deepEqual(delta, { week: 1, month: 1, all: 1 });
});

test("a ticked box that was never confirmed adds no subscriber", async () => {
  const delta = await added(() =>
    place(buyer(), true, undefined, { confirmed: false }),
  );

  assert.deepEqual(delta, { week: 0, month: 0, all: 0 });
});

test("a subscriber who unsubscribed is no longer counted", async () => {
  const email = buyer();
  await place(email, true);

  const delta = await added(async () => {
    await prisma.consent.updateMany({
      where: { kind: "OFFERS", order: { customer: { email } } },
      data: { withdrawnAt: new Date() },
    });
  });

  assert.deepEqual(delta, { week: -1, month: -1, all: -1 });
});

const BOUNDARIES: [number, Record<Period, number>][] = [
  [6, { week: 1, month: 1, all: 1 }],
  [7, { week: 0, month: 1, all: 1 }],
  [29, { week: 0, month: 1, all: 1 }],
  [30, { week: 0, month: 0, all: 1 }],
];

for (const [days, expected] of BOUNDARIES) {
  test(`a first confirmation ${days} Sofia days ago lands in the right periods`, async () => {
    const delta = await added(() => place(buyer(), true, daysAgo(days)));

    assert.deepEqual(delta, expected);
  });
}
