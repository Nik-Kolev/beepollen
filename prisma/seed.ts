import { readOfficeSnapshot } from "@/lib/econt-snapshot";
import prisma from "@/lib/prisma";

const SUMMARY = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

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

async function seedOffices() {
  const offices = readOfficeSnapshot();

  await prisma.deliveryOffice.deleteMany({
    where: {
      carrier: "ECONT",
      code: { notIn: offices.map((office) => office.code) },
    },
  });

  await prisma.$transaction(
    offices.map(({ location, ...office }) => {
      const row = {
        ...office,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
      };

      return prisma.deliveryOffice.upsert({
        where: { carrier_code: { carrier: "ECONT", code: office.code } },
        update: row,
        create: { carrier: "ECONT", ...row },
      });
    }),
  );

  return offices.length;
}

async function main() {
  await prisma.product.deleteMany({
    where: { id: { notIn: products.map((product) => product.id) } },
  });

  for (const { id, images, ...product } of products) {
    await prisma.product.upsert({
      where: { id },
      update: product,
      create: { id, ...product },
    });

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

  const officeCount = await seedOffices();

  console.log(
    `Seeded ${products.length} products and ${officeCount} Econt offices.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
