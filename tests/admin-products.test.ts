import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  editProduct,
  formatPriceInput,
  listProductsForAdmin,
  parsePriceCents,
} from "@/lib/admin-products";
import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

const SLUG = "pchelen-prashets-1kg";

async function withRestoredProduct(run: () => Promise<void>) {
  const before = await prisma.product.findUniqueOrThrow({
    where: { slug: SLUG },
  });
  try {
    await run();
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

test("lists every product in shop order, drafts included", async () => {
  const listed = await listProductsForAdmin();

  assert.deepEqual(
    listed.map(({ slug, isPublished }) => ({ slug, isPublished })),
    [
      { slug: "pchelen-prashets-500g", isPublished: true },
      { slug: "pchelen-prashets-1kg", isPublished: true },
      { slug: "lorem-ipsum", isPublished: false },
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
  await withRestoredProduct(async () => {
    const before = await prisma.product.findUniqueOrThrow({
      where: { slug: SLUG },
    });

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
  await withRestoredProduct(async () => {
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
    assert.notEqual(unchanged.stock, "LOW");
  });
});
