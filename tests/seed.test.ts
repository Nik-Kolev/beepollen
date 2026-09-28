import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, test } from "node:test";

import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

function runSeed() {
  execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
    env: process.env,
    stdio: "ignore",
  });
}

test("re-seeding keeps the price and stock set in the admin, and restores the seeded content", async () => {
  const slug = "pchelen-prashets-500g";
  const seeded = await prisma.product.findUniqueOrThrow({ where: { slug } });

  await prisma.product.update({
    where: { slug },
    data: { priceCents: 3120, stock: "LOW", name: "Сменено име" },
  });

  try {
    runSeed();

    const reseeded = await prisma.product.findUniqueOrThrow({
      where: { slug },
    });
    assert.equal(reseeded.priceCents, 3120);
    assert.equal(reseeded.stock, "LOW");
    assert.equal(reseeded.name, seeded.name);
  } finally {
    await prisma.product.update({
      where: { slug },
      data: { priceCents: seeded.priceCents, stock: seeded.stock },
    });
  }
});
