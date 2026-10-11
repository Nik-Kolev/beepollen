import { randomUUID } from "node:crypto";

import {
  applyOrderStep,
  orderStatus,
  type OrderStep,
} from "@/lib/admin-orders";
import { placeOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";

const samples: {
  name: string;
  phone: string;
  city: string | null;
  items: { slug: string; quantity: number }[];
  steps: OrderStep[];
}[] = [
  {
    name: "Мария Петрова",
    phone: "0888123401",
    city: "Варна",
    items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
    steps: [],
  },
  {
    name: "Георги Иванов",
    phone: "0888123402",
    city: null,
    items: [{ slug: "pchelen-prashets-1kg", quantity: 1 }],
    steps: [],
  },
  {
    name: "Елена Димитрова",
    phone: "0888123403",
    city: "Пловдив",
    items: [
      { slug: "pchelen-prashets-500g", quantity: 1 },
      { slug: "pchelen-prashets-1kg", quantity: 1 },
    ],
    steps: [],
  },
  {
    name: "Петър Николов",
    phone: "0888123404",
    city: "София",
    items: [{ slug: "pchelen-prashets-1kg", quantity: 2 }],
    steps: ["send"],
  },
  {
    name: "Иванка Стоянова",
    phone: "0888123405",
    city: "Бургас",
    items: [{ slug: "pchelen-prashets-500g", quantity: 3 }],
    steps: ["send"],
  },
  {
    name: "Николай Георгиев",
    phone: "0888123406",
    city: "Русе",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    steps: ["send", "pay"],
  },
  {
    name: "Даниела Колева",
    phone: "0888123407",
    city: null,
    items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
    steps: ["handOver"],
  },
  {
    name: "Стефан Василев",
    phone: "0888123408",
    city: "Велико Търново",
    items: [{ slug: "pchelen-prashets-1kg", quantity: 1 }],
    steps: ["send", "pay"],
  },
  {
    name: "Цветелина Маринова",
    phone: "0888123409",
    city: "Шумен",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    steps: ["send", "return"],
  },
  {
    name: "Христо Тодоров",
    phone: "0888123410",
    city: "Плевен",
    items: [{ slug: "pchelen-prashets-1kg", quantity: 1 }],
    steps: ["send", "return", "collect"],
  },
  {
    name: "Радослава Илиева",
    phone: "0888123411",
    city: "Габрово",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    steps: ["cancel"],
  },
  {
    name: "Васил Атанасов",
    phone: "0888123412",
    city: "Търговище",
    items: [{ slug: "pchelen-prashets-500g", quantity: 4 }],
    steps: [],
  },
];

async function officeIn(city: string) {
  const office = await prisma.deliveryOffice.findFirst({
    where: { carrier: "ECONT", city },
    orderBy: { code: "asc" },
    select: { code: true },
  });
  if (!office) throw new Error(`No Econt office in ${city}.`);
  return office.code;
}

async function main() {
  for (const sample of samples) {
    const result = await placeOrder(
      {
        name: sample.name,
        email: `sample-${randomUUID().slice(0, 8)}@example.com`,
        phone: sample.phone,
        items: sample.items,
        deliveryMethod: sample.city ? "ECONT_OFFICE" : "LOCAL",
        officeCode: sample.city ? await officeIn(sample.city) : "",
        acceptsTerms: true,
        acceptsOffers: false,
        idempotencyKey: randomUUID(),
      },
      null,
    );
    if (!result.ok) throw new Error(`Order refused: ${result.code}`);

    const { reference } = result.order;
    for (const step of sample.steps) {
      const order = await prisma.order.findUniqueOrThrow({
        where: { reference },
      });
      const outcome = await applyOrderStep(reference, step, orderStatus(order));
      if (!outcome.ok) {
        throw new Error(`Step ${step} refused on ${reference}.`);
      }
    }
  }
  console.log(`Placed ${samples.length} sample orders.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
