import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import {
  editProduct,
  formatPriceInput,
  listProductsForAdmin,
  parsePriceCents,
} from "@/lib/admin-products";
import prisma from "@/lib/prisma";

const SLUG = "pchelen-prashets-1kg";

async function withRestoredProduct(
  run: (before: { priceCents: number; stock: string }) => Promise<void>,
) {
  const before = await prisma.product.findUniqueOrThrow({
    where: { slug: SLUG },
  });
  try {
    await run(before);
  } finally {
    await prisma.product.update({
      where: { slug: SLUG },
      data: { priceCents: before.priceCents, stock: before.stock },
    });
  }
}

test("reads a price typed with a comma, a point or no decimals as cents", () => {
  assert.equal(parsePriceCents("24,50"), 2450);
  assert.equal(parsePriceCents("24.50"), 2450);
  assert.equal(parsePriceCents("24,5"), 2450);
  assert.equal(parsePriceCents("24"), 2400);
  assert.equal(parsePriceCents(" 0,05 "), 5);
  assert.equal(parsePriceCents("999999,99"), 99999999);
});

test("refuses a price that is zero, negative, over two decimals or not a number", () => {
  for (const text of [
    "",
    "0",
    "0,00",
    "-1",
    "24,505",
    "1 000",
    "1.000,00",
    "24,",
    ",50",
    "1e3",
    "abc",
    "1000000",
  ]) {
    assert.equal(parsePriceCents(text), null, JSON.stringify(text));
  }
});

test("shows cents in the price field with a comma and two decimals", () => {
  assert.equal(formatPriceInput(2450), "24,50");
  assert.equal(formatPriceInput(5), "0,05");
  assert.equal(formatPriceInput(4500), "45,00");
});

test("lists every product in shop order, drafts included, each with its first photo", async () => {
  const listed = await listProductsForAdmin();

  assert.deepEqual(
    listed.map(({ slug, images }) => ({ slug, photos: images.length })),
    [
      { slug: "pchelen-prashets-500g", photos: 1 },
      { slug: "pchelen-prashets-1kg", photos: 1 },
      { slug: "lorem-ipsum", photos: 0 },
    ],
  );
});

test("an edit stores the new price and stock on that product only", async () => {
  await withRestoredProduct(async () => {
    const other = await prisma.product.findUniqueOrThrow({
      where: { slug: "pchelen-prashets-500g" },
    });

    const result = await editProduct({
      slug: SLUG,
      price: "51,20",
      stock: "NONE",
    });

    assert.deepEqual(result, { ok: true, slug: SLUG });
    const edited = await prisma.product.findUniqueOrThrow({
      where: { slug: SLUG },
    });
    assert.equal(edited.priceCents, 5120);
    assert.equal(edited.stock, "NONE");
    const untouched = await prisma.product.findUniqueOrThrow({
      where: { slug: "pchelen-prashets-500g" },
    });
    assert.equal(untouched.priceCents, other.priceCents);
    assert.equal(untouched.stock, other.stock);
  });
});

test("a refused price leaves the product unchanged", async () => {
  await withRestoredProduct(async (before) => {
    const result = await editProduct({ slug: SLUG, price: "-5", stock: "LOW" });

    assert.deepEqual(result, { ok: false, code: "INVALID_PRICE" });
    const kept = await prisma.product.findUniqueOrThrow({
      where: { slug: SLUG },
    });
    assert.equal(kept.priceCents, before.priceCents);
    assert.equal(kept.stock, before.stock);
  });
});

test("an unknown slug is answered as an unknown product", async () => {
  assert.deepEqual(
    await editProduct({ slug: "no-such-product", price: "10", stock: "LOW" }),
    { ok: false, code: "UNKNOWN_PRODUCT" },
  );
});

test("a crafted edit with an unknown stock level or a non-string field is refused", async () => {
  await withRestoredProduct(async (before) => {
    const valid = { slug: SLUG, price: "10", stock: "LOW" };
    for (const crafted of [
      { ...valid, stock: "MANY" },
      { ...valid, price: 1000 },
      { ...valid, slug: { contains: "" } },
      { ...valid, slug: "" },
      { ...valid, price: "1".repeat(21) },
      { price: "10", stock: "LOW" },
      null,
    ]) {
      assert.deepEqual(
        await editProduct(crafted),
        { ok: false, code: "INVALID_INPUT" },
        JSON.stringify(crafted),
      );
    }

    const unchanged = await prisma.product.findUniqueOrThrow({
      where: { slug: SLUG },
    });
    assert.equal(unchanged.priceCents, before.priceCents);
    assert.equal(unchanged.stock, before.stock);
  });
});

const ADMIN = "admin@example.com";
const TODAY = "2026-11-14";
const NOW = new Date("2026-11-14T10:00:00Z");
const created: number[] = [];

after(async () => {
  await prisma.product.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

async function promotedProduct() {
  const product = await prisma.product.create({
    data: {
      slug: `price-change-${randomUUID()}`,
      name: "Продукт със смяна на цена",
      summary: "test",
      description: "test",
      priceCents: 1000,
    },
  });
  created.push(product.id);
  const promotion = (startsOn: string, endsOn: string, ended?: Date) =>
    prisma.promotion.create({
      data: {
        productId: product.id,
        kind: "PERCENT",
        value: 20,
        startsOn,
        endsOn,
        endedAt: ended,
        createdBy: ADMIN,
      },
    });
  const running = await promotion("2026-11-10", TODAY);
  const upcoming = await promotion("2026-11-20", "2026-11-25");
  const finished = await promotion("2026-11-01", "2026-11-05");
  await promotion("2026-11-12", "2026-11-30", NOW);
  return { product, running, upcoming, finished };
}

async function endedAt(id: number) {
  return (await prisma.promotion.findUniqueOrThrow({ where: { id } })).endedAt;
}

test("a new price with open promotions is refused, naming them, until they are confirmed", async () => {
  const { product, running, upcoming } = await promotedProduct();

  const result = await editProduct(
    { slug: product.slug, price: "8,00", stock: "LOW" },
    NOW,
    TODAY,
  );

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.code, "PROMOTION_OPEN");
  assert.deepEqual(
    !result.ok &&
      "promotions" in result &&
      result.promotions.map(({ id }) => id),
    [running.id, upcoming.id],
  );
  const kept = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  assert.equal(kept.priceCents, 1000);
  assert.equal(kept.stock, product.stock);
  assert.equal(await endedAt(running.id), null);
  assert.equal(await endedAt(upcoming.id), null);
});

test("a confirmed new price is saved and ends the running and the upcoming promotion, not a finished one", async () => {
  const { product, running, upcoming, finished } = await promotedProduct();

  assert.deepEqual(
    await editProduct(
      {
        slug: product.slug,
        price: "8,00",
        stock: "LOW",
        endPromotionIds: [upcoming.id, running.id],
      },
      NOW,
      TODAY,
    ),
    { ok: true, slug: product.slug },
  );

  const saved = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  assert.equal(saved.priceCents, 800);
  assert.equal(saved.stock, "LOW");
  assert.deepEqual(await endedAt(running.id), NOW);
  assert.deepEqual(await endedAt(upcoming.id), NOW);
  assert.equal(await endedAt(finished.id), null);
});

test("a confirmation that misses a promotion opened since is refused and ends nothing", async () => {
  const { product, running, upcoming } = await promotedProduct();

  const result = await editProduct(
    {
      slug: product.slug,
      price: "8,00",
      stock: "LOW",
      endPromotionIds: [running.id],
    },
    NOW,
    TODAY,
  );

  assert.equal(!result.ok && result.code, "PROMOTION_OPEN");
  assert.equal(await endedAt(running.id), null);
  assert.equal(await endedAt(upcoming.id), null);
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
      .priceCents,
    1000,
  );
});

test("a save that keeps the price, however it is typed, changes the stock and leaves the promotions", async () => {
  const { product, running, upcoming } = await promotedProduct();

  assert.deepEqual(
    await editProduct(
      { slug: product.slug, price: "10", stock: "NONE" },
      NOW,
      TODAY,
    ),
    { ok: true, slug: product.slug },
  );

  const saved = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  assert.equal(saved.stock, "NONE");
  assert.equal(await endedAt(running.id), null);
  assert.equal(await endedAt(upcoming.id), null);
});
