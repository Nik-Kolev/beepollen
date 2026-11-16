import { officeRow, readOfficeSnapshot } from "@/lib/econt-snapshot";
import { assertPublishable } from "@/lib/food-information";
import { WEB_NUTRITION_PER_100G } from "@/lib/nutrition";
import prisma from "@/lib/prisma";

const SUMMARY =
  "Натурален пчелен прашец от нашите пчели край Попово — био продукт, който се яде сам, с мед или с кисело мляко.";

const TODO_PRICE = {
  pollen500: 2450,
  pollen1000: 4590,
};

const DESCRIPTION = [
  "Пчелният прашец е цветен прашец, който пчелите събират от цъфтящите растения и оформят на малки зрънца. Цветът и вкусът му зависят от растенията, от които е събран, затова всяка партида е малко по-различна.",
  [
    "Как да го консумирате:",
    "За възрастни — по 1–2 чаени лъжички дневно.",
    "За деца над 3 години — по половин чаена лъжичка дневно.",
    "Може да го ядете направо, разбъркан в кисело мляко или смути, или смесен с мед в съотношение 1:1. Ако го накиснете от вечерта, се яде по-лесно.",
  ].join("\n"),
  "Био продукт. Сертификат за биологично производство: TODO: линк към сертификата и код на контролиращия орган",
].join("\n\n");

const FOOD_INFORMATION = {
  composition: "100% пчелен прашец",
  origin: "България",
  storage: "На сухо, хладно и тъмно място, в добре затворена опаковка.",
  bestBefore: "1 година",
  allergenInfo:
    "Пчелният прашец е съставен от полени на различни растения и може да предизвика алергична реакция при хора, алергични към полени или пчелни продукти. Не е подходящ за деца под 3 години.",
  ...WEB_NUTRITION_PER_100G,
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
    offices.map((office) => {
      const row = officeRow(office);

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
  products.forEach(assertPublishable);

  await prisma.product.deleteMany({
    where: { id: { notIn: products.map((product) => product.id) } },
  });

  for (const { id, images, ...product } of products) {
    const { priceCents, ...content } = product;
    await prisma.product.upsert({
      where: { id },
      update: content,
      create: { id, priceCents, ...content },
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
