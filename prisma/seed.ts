import prisma from "@/lib/prisma";

// Lorem ipsum and visible markers only: plausible Bulgarian filler and an
// invented price both survive to launch unnoticed.
const SUMMARY = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const DESCRIPTION = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod",
  "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
  "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
].join(" ");

const FOOD_INFORMATION = {
  composition: "TODO: състав",
  origin: "TODO: страна на добив",
  storage: "TODO: условия на съхранение",
  bestBefore: "TODO: срок на годност",
  allergenInfo: "TODO: алергени",
};

const products = [
  {
    id: 1,
    slug: "pchelen-prashets-500g",
    name: "Пчелен прашец 500 г",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: null,
    priceCents: 0,
    sortOrder: 0,
    isPublished: true,
    netWeightGrams: 500,
    ...FOOD_INFORMATION,
    images: [
      {
        path: "/products/pollen-500g-bag.jpg",
        alt: "Пакет пчелен прашец 500 г",
      },
      { path: "/products/pollen-plate.jpg", alt: "Пчелен прашец в чиния" },
    ],
  },
  {
    id: 2,
    slug: "pchelen-prashets-1kg",
    name: "Пчелен прашец 1 кг",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: null,
    priceCents: 0,
    sortOrder: 1,
    isPublished: true,
    netWeightGrams: 1000,
    ...FOOD_INFORMATION,
    images: [
      { path: "/products/pollen-1kg-bag.jpg", alt: "Пакет пчелен прашец 1 кг" },
      {
        path: "/products/pollen-plate-with-bag.jpg",
        alt: "Пчелен прашец в чиния пред пакет от 1 кг",
      },
    ],
  },
  {
    id: 4,
    slug: "pchelen-med-450g",
    name: "Пчелен мед 450 г",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: "TODO: сорт",
    priceCents: 0,
    sortOrder: 2,
    isPublished: true,
    netWeightGrams: 450,
    ...FOOD_INFORMATION,
    images: [
      {
        path: "/products/honey-jars.jpg",
        alt: "Два буркана мед върху дървена дъска сред зеленина",
      },
      {
        path: "/products/honey-jars-stacked.jpg",
        alt: "Редици буркани с мед на дървена маса",
      },
    ],
  },
  {
    id: 5,
    slug: "pchelen-med-900g",
    name: "Пчелен мед 900 г",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: "TODO: сорт",
    priceCents: 0,
    sortOrder: 3,
    isPublished: true,
    netWeightGrams: 900,
    ...FOOD_INFORMATION,
    images: [
      {
        path: "/products/honey-jars-apiary.jpg",
        alt: "Четири буркана мед на дървена маса до рамка с пита",
      },
      {
        path: "/products/honey-jars-crystallised.jpg",
        alt: "Буркан с кристализирал мед до буркан с течен мед",
      },
    ],
  },
  {
    id: 6,
    slug: "med-s-pita-450g",
    name: "Мед с пита 450 г",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: "TODO: сорт",
    priceCents: 0,
    sortOrder: 4,
    isPublished: true,
    netWeightGrams: 450,
    ...FOOD_INFORMATION,
    images: [
      {
        path: "/products/honey-comb-in-jar.jpg",
        alt: "Буркан мед с парче пита вътре",
      },
    ],
  },
  {
    id: 7,
    slug: "pchelna-pita-400g",
    name: "Пчелна пита 400 г",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: "TODO: сорт",
    priceCents: 0,
    sortOrder: 5,
    isPublished: true,
    netWeightGrams: 400,
    ...FOOD_INFORMATION,
    images: [
      {
        path: "/products/honeycomb.jpg",
        alt: "Пчелна пита със запечатани восъчни капачета",
      },
    ],
  },
  // Unpublished with no food information, so the catalog has a row it must
  // filter and the publish gate has a failing case.
  {
    id: 3,
    slug: "lorem-ipsum",
    name: "Lorem ipsum",
    summary: SUMMARY,
    description: DESCRIPTION,
    variety: null,
    priceCents: 0,
    sortOrder: 6,
    isPublished: false,
    netWeightGrams: null,
    composition: null,
    origin: null,
    storage: null,
    bestBefore: null,
    allergenInfo: null,
    images: [],
  },
];

async function main() {
  for (const { id, images, ...product } of products) {
    await prisma.product.upsert({
      where: { id },
      update: product,
      create: { id, ...product },
    });

    // Image rows have no natural key and the seed is their only writer, so
    // they are replaced wholesale — atomically, or an interrupt leaves none.
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productImage.createMany({
        data: images.map((image, sortOrder) => ({
          ...image,
          productId: id,
          sortOrder,
        })),
      }),
    ]);
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
