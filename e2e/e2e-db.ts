import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export function placeLocalOrder(email: string, phone: string) {
  return placeInE2eDb(email, phone, "LOCAL", "");
}

export function placeEcontOrder(email: string, phone: string) {
  return placeInE2eDb(email, phone, "ECONT_OFFICE", "1127");
}

function placeInE2eDb(
  email: string,
  phone: string,
  deliveryMethod: string,
  officeCode: string,
) {
  const input = {
    name: "Отказ Тестов",
    email,
    phone,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    deliveryMethod,
    officeCode,
    acceptsTerms: true,
    acceptsOffers: false,
    idempotencyKey: randomUUID(),
  };
  const script = `
    import("@/lib/orders").then(async (module) => {
      const { placeOrder } = module.placeOrder ? module : module.default;
      const prisma = (await import("@/lib/prisma")).default;
      const result = await placeOrder(${JSON.stringify(input)}, null);
      await (prisma.default ?? prisma).$disconnect();
      if (!result.ok) throw new Error(JSON.stringify(result));
      process.stdout.write(result.order.reference);
    });
  `;
  return execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
    env: {
      ...process.env,
      DATABASE_URL: "file:./data/e2e.db",
      ORDERING_OPEN: "true",
    },
    encoding: "utf8",
  });
}

export function backdateOrderSteps(reference: string, hoursAgo: number) {
  const at = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  runInE2eDb(`
    const at = new Date(${JSON.stringify(at)});
    const order = await prisma.order.findUniqueOrThrow({
      where: { reference: ${JSON.stringify(reference)} },
    });
    await prisma.order.update({
      where: { reference: order.reference },
      data: Object.fromEntries(
        ["sentAt", "paidAt", "cancelledAt", "collectedAt"]
          .filter((field) => order[field] !== null)
          .map((field) => [field, at]),
      ),
    });
    await prisma.orderEvent.updateMany({
      where: { orderId: order.id },
      data: { createdAt: at },
    });
  `);
}

function runInE2eDb(body: string) {
  const script = `
    import("@/lib/prisma").then(async (module) => {
      const prisma = module.default.default ?? module.default;
      ${body}
      await prisma.$disconnect();
    });
  `;
  execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
    env: { ...process.env, DATABASE_URL: "file:./data/e2e.db" },
    stdio: "inherit",
  });
}

export function publishTestProduct(
  slug: string,
  images: { path: string; alt: string }[],
) {
  const data = {
    slug,
    name: `Тестов продукт ${slug}`,
    summary: "Lorem ipsum dolor sit amet.",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    priceCents: 1000,
    sortOrder: 90,
    isPublished: true,
    images: { create: images },
  };
  runInE2eDb(`
    await prisma.product.deleteMany({ where: { slug: ${JSON.stringify(slug)} } });
    await prisma.product.create({ data: ${JSON.stringify(data)} });
  `);
}

export function deleteTestProduct(slug: string) {
  runInE2eDb(
    `await prisma.product.deleteMany({ where: { slug: ${JSON.stringify(slug)} } });`,
  );
}
