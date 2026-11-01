import { officeRow } from "@/lib/econt-snapshot";
import prisma from "@/lib/prisma";

import { FIXTURE_OFFICES } from "../tests/support/fixture-offices";

const draft = {
  name: "Lorem ipsum",
  summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  variety: null,
  priceCents: 0,
  sortOrder: 2,
  isPublished: false,
  netWeightGrams: null,
  composition: null,
  origin: null,
  storage: null,
  bestBefore: null,
  allergenInfo: null,
};

async function main() {
  await prisma.product.upsert({
    where: { slug: "lorem-ipsum" },
    update: draft,
    create: { slug: "lorem-ipsum", ...draft },
  });
  console.log("Seeded the lorem-ipsum test draft.");

  await prisma.$transaction(
    FIXTURE_OFFICES.map((office) => {
      const row = officeRow(office);

      return prisma.deliveryOffice.upsert({
        where: { carrier_code: { carrier: "ECONT", code: office.code } },
        update: row,
        create: { carrier: "ECONT", ...row },
      });
    }),
  );
  console.log(`Seeded ${FIXTURE_OFFICES.length} test offices.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
