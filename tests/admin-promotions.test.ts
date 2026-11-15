import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import {
  endPromotion,
  parsePercent,
  promotionStatus,
  savePromotion,
} from "@/lib/admin-promotions";
import prisma from "@/lib/prisma";

const ADMIN = "admin@example.com";
const TODAY = "2026-11-14";
const created: number[] = [];

after(async () => {
  await prisma.product.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

async function product() {
  const slug = `admin-promo-${randomUUID()}`;
  const row = await prisma.product.create({
    data: {
      slug,
      name: "Продукт за промоция",
      summary: "test",
      description: "test",
      priceCents: 1000,
    },
  });
  created.push(row.id);
  return slug;
}

function input(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    kind: "PERCENT",
    value: "20",
    startsOn: "2026-11-14",
    endsOn: "2026-11-20",
    ...overrides,
  };
}

test("reads a percentage from 1 to 99, with or without the sign", () => {
  assert.equal(parsePercent("20"), 20);
  assert.equal(parsePercent(" 5 % "), 5);
  assert.equal(parsePercent("99"), 99);
  for (const text of ["0", "100", "", "-5", "12,5", "abc"]) {
    assert.equal(parsePercent(text), null, text);
  }
});

test("a valid promotion is saved with the admin who made it", async () => {
  const slug = await product();
  const result = await savePromotion(input(slug), ADMIN, TODAY);
  assert.deepEqual(result, { ok: true, slug });

  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });
  assert.equal(row.kind, "PERCENT");
  assert.equal(row.value, 20);
  assert.equal(row.createdBy, ADMIN);
});

test("a fixed price is stored in cents", async () => {
  const slug = await product();
  await savePromotion(
    input(slug, { kind: "PRICE", value: "6,50" }),
    ADMIN,
    TODAY,
  );
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });
  assert.equal(row.value, 650);
});

test("a promotion that does not lower the regular price is refused", async () => {
  const slug = await product();
  for (const value of ["10", "10,00", "12"]) {
    assert.deepEqual(
      await savePromotion(input(slug, { kind: "PRICE", value }), ADMIN, TODAY),
      { ok: false, code: "NOT_LOWER" },
    );
  }
});

test("a bad percentage, price or date is refused with its own reason", async () => {
  const slug = await product();
  const cases: [Record<string, unknown>, string][] = [
    [{ value: "0" }, "INVALID_PERCENT"],
    [{ value: "150" }, "INVALID_PERCENT"],
    [{ kind: "PRICE", value: "0" }, "INVALID_PRICE"],
    [{ startsOn: "2026-11-20", endsOn: "2026-11-19" }, "INVALID_DATES"],
    [{ startsOn: "2026-11-01", endsOn: "2026-11-13" }, "ENDS_IN_PAST"],
    [{ startsOn: "2026-11-13" }, "STARTS_IN_PAST"],
    [{ startsOn: "2026-02-30" }, "INVALID_INPUT"],
    [{ endsOn: "" }, "INVALID_INPUT"],
  ];
  for (const [overrides, code] of cases) {
    assert.deepEqual(
      await savePromotion(input(slug, overrides), ADMIN, TODAY),
      { ok: false, code },
      JSON.stringify(overrides),
    );
  }
  assert.equal(
    await prisma.promotion.count({ where: { product: { slug } } }),
    0,
  );
});

test("a product has at most one open promotion, upcoming or running", async () => {
  const slug = await product();
  await savePromotion(
    input(slug, { startsOn: "2026-11-16", endsOn: "2026-11-18" }),
    ADMIN,
    TODAY,
  );

  assert.deepEqual(
    await savePromotion(
      input(slug, { startsOn: "2026-11-21", endsOn: "2026-11-25" }),
      ADMIN,
      TODAY,
    ),
    { ok: false, code: "ALREADY_OPEN" },
  );
  assert.deepEqual(
    await savePromotion(
      input(slug, { startsOn: "2026-11-21", endsOn: "2026-11-25" }),
      ADMIN,
      "2026-11-17",
    ),
    { ok: false, code: "ALREADY_OPEN" },
  );
  assert.equal(
    await prisma.promotion.count({ where: { product: { slug } } }),
    1,
  );
});

test("a finished promotion no longer blocks a new one", async () => {
  const slug = await product();
  await savePromotion(
    input(slug, { startsOn: "2026-11-14", endsOn: "2026-11-15" }),
    ADMIN,
    TODAY,
  );

  assert.deepEqual(
    await savePromotion(
      input(slug, { startsOn: "2026-11-16", endsOn: "2026-11-20" }),
      ADMIN,
      "2026-11-16",
    ),
    { ok: true, slug },
  );
});

test("an ended promotion no longer blocks its days", async () => {
  const slug = await product();
  await savePromotion(input(slug), ADMIN, TODAY);
  const first = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });

  assert.deepEqual(await endPromotion(first.id), { ok: true, slug });
  assert.deepEqual(await savePromotion(input(slug), ADMIN, TODAY), {
    ok: true,
    slug,
  });
});

test("editing the open promotion does not count it as a second one", async () => {
  const slug = await product();
  await savePromotion(input(slug), ADMIN, TODAY);
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });

  assert.deepEqual(
    await savePromotion(
      input(slug, { id: row.id, value: "30", endsOn: "2026-11-22" }),
      ADMIN,
      TODAY,
    ),
    { ok: true, slug },
  );
  const edited = await prisma.promotion.findUniqueOrThrow({
    where: { id: row.id },
  });
  assert.equal(edited.value, 30);
  assert.equal(edited.endsOn, "2026-11-22");
  assert.equal(
    await prisma.promotion.count({ where: { product: { slug } } }),
    1,
  );
});

test("a running promotion keeps its past start on edit, but cannot move it to another past day", async () => {
  const slug = await product();
  await savePromotion(input(slug), ADMIN, TODAY);
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });
  const later = "2026-11-17";

  assert.deepEqual(
    await savePromotion(input(slug, { id: row.id, value: "30" }), ADMIN, later),
    { ok: true, slug },
  );
  assert.deepEqual(
    await savePromotion(
      input(slug, { id: row.id, startsOn: "2026-11-15" }),
      ADMIN,
      later,
    ),
    { ok: false, code: "STARTS_IN_PAST" },
  );
  const edited = await prisma.promotion.findUniqueOrThrow({
    where: { id: row.id },
  });
  assert.equal(edited.value, 30);
  assert.equal(edited.startsOn, "2026-11-14");
});

test("an ended promotion, or one of another product, cannot be edited", async () => {
  const slug = await product();
  const other = await product();
  await savePromotion(input(slug), ADMIN, TODAY);
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });

  assert.deepEqual(
    await savePromotion(input(other, { id: row.id }), ADMIN, TODAY),
    { ok: false, code: "UNKNOWN_PROMOTION" },
  );
  await endPromotion(row.id);
  assert.deepEqual(
    await savePromotion(input(slug, { id: row.id }), ADMIN, TODAY),
    { ok: false, code: "UNKNOWN_PROMOTION" },
  );
});

test("a promotion whose last day has passed cannot be edited back to life", async () => {
  const slug = await product();
  await savePromotion(
    input(slug, { startsOn: "2026-11-14", endsOn: "2026-11-15" }),
    ADMIN,
    TODAY,
  );
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });

  assert.deepEqual(
    await savePromotion(
      input(slug, { id: row.id, endsOn: "2026-11-30" }),
      ADMIN,
      "2026-11-16",
    ),
    { ok: false, code: "UNKNOWN_PROMOTION" },
  );
  const unchanged = await prisma.promotion.findUniqueOrThrow({
    where: { id: row.id },
  });
  assert.equal(unchanged.endsOn, "2026-11-15");
});

test("ending a promotion twice, or one that does not exist, is refused", async () => {
  const slug = await product();
  await savePromotion(input(slug), ADMIN, TODAY);
  const row = await prisma.promotion.findFirstOrThrow({
    where: { product: { slug } },
  });

  assert.equal((await endPromotion(row.id)).ok, true);
  assert.deepEqual(await endPromotion(row.id), {
    ok: false,
    code: "UNKNOWN_PROMOTION",
  });
  assert.deepEqual(await endPromotion("1"), {
    ok: false,
    code: "UNKNOWN_PROMOTION",
  });
});

test("the status reads from the dates and whether it was ended", () => {
  const range = { startsOn: "2026-11-14", endsOn: "2026-11-20" };
  assert.equal(
    promotionStatus({ ...range, endedAt: null }, "2026-11-13"),
    "UPCOMING",
  );
  assert.equal(
    promotionStatus({ ...range, endedAt: null }, "2026-11-14"),
    "ACTIVE",
  );
  assert.equal(
    promotionStatus({ ...range, endedAt: null }, "2026-11-20"),
    "ACTIVE",
  );
  assert.equal(
    promotionStatus({ ...range, endedAt: null }, "2026-11-21"),
    "FINISHED",
  );
  assert.equal(
    promotionStatus({ ...range, endedAt: new Date() }, "2026-11-15"),
    "ENDED",
  );
});
