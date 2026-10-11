import prisma from "@/lib/prisma";

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
