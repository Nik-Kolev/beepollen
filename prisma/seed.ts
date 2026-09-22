import prisma from "@/lib/prisma";

// Lorem ipsum and visible markers only: plausible Bulgarian filler survives to
// launch unnoticed, where a marker cannot.
const SUMMARY = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

// Placeholder prices the owner still owes; deleted at launch, never corrected.
// Distinct on purpose — equal prices hide a quantity or subtotal bug.
const TODO_PRICE = {
  pollen500: 2450,
  pollen1000: 4590,
};

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
    priceCents: TODO_PRICE.pollen500,
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
    priceCents: TODO_PRICE.pollen1000,
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
    sortOrder: 2,
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
  // Upsert alone leaves a product dropped from this file sitting in an existing
  // database, still published; images cascade with it.
  await prisma.product.deleteMany({
    where: { id: { notIn: products.map((product) => product.id) } },
  });

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
