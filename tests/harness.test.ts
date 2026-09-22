import assert from "node:assert/strict";
import { test } from "node:test";

import prisma from "@/lib/prisma";

test("the test suite is pointed at the throwaway test database, not the developer's own", () => {
  assert.equal(process.env.DATABASE_URL, "file:./data/test.db");
});

test("the seed publishes exactly the two pollen products in catalogue order", async () => {
  const published = await prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, priceCents: true },
  });

  assert.deepEqual(published, [
    { slug: "pchelen-prashets-500g", priceCents: 2450 },
    { slug: "pchelen-prashets-1kg", priceCents: 4590 },
  ]);
});

test("the seed leaves the lorem-ipsum draft unpublished and priced at zero", async () => {
  const draft = await prisma.product.findUnique({
    where: { slug: "lorem-ipsum" },
    select: { isPublished: true, priceCents: true },
  });

  assert.deepEqual(draft, { isPublished: false, priceCents: 0 });

  await prisma.$disconnect();
});
