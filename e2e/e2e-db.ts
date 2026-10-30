import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export function placeLocalOrder(email: string, phone: string) {
  return placeInE2eDb(email, phone, "LOCAL", "");
}

export function placeEcontOrder(email: string, phone: string) {
  return placeInE2eDb(email, phone, "ECONT_OFFICE", "1127");
}

export function placeOrderWithOffers(email: string) {
  return placeInE2eDb(email, "0888123456", "ECONT_OFFICE", "1127", true);
}

const ORDER_ATTEMPTS = 3;

function placeInE2eDb(
  email: string,
  phone: string,
  deliveryMethod: string,
  officeCode: string,
  acceptsOffers = false,
) {
  const input = {
    name: "Отказ Тестов",
    email,
    phone,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    deliveryMethod,
    officeCode,
    acceptsTerms: true,
    acceptsOffers,
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
  for (let attempt = 1; ; attempt += 1) {
    try {
      return execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
        env: {
          ...process.env,
          DATABASE_URL: "file:./data/e2e.db",
          ORDERING_OPEN: "true",
        },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr ?? "";
      if (attempt === ORDER_ATTEMPTS || !stderr.includes("SQLITE_BUSY")) {
        throw error;
      }
    }
  }
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

export function offersConsent(reference: string): {
  id: number;
  customerId: number;
  confirmedAt: string | null;
  withdrawnAt: string | null;
} {
  const script = `
    import("@/lib/prisma").then(async (module) => {
      const prisma = module.default.default ?? module.default;
      const consent = await prisma.consent.findFirstOrThrow({
        where: { kind: "OFFERS", order: { reference: ${JSON.stringify(reference)} } },
        select: {
          id: true,
          confirmedAt: true,
          withdrawnAt: true,
          order: { select: { customerId: true } },
        },
      });
      await prisma.$disconnect();
      process.stdout.write(JSON.stringify({
        id: consent.id,
        customerId: consent.order.customerId,
        confirmedAt: consent.confirmedAt,
        withdrawnAt: consent.withdrawnAt,
      }));
    });
  `;
  return JSON.parse(
    execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
      env: { ...process.env, DATABASE_URL: "file:./data/e2e.db" },
      encoding: "utf8",
    }),
  );
}

export function editEvents(
  reference: string,
): { emailStatus: string | null }[] {
  const script = `
    import("@/lib/prisma").then(async (module) => {
      const prisma = module.default.default ?? module.default;
      const events = await prisma.orderEvent.findMany({
        where: { kind: "EDIT", order: { reference: ${JSON.stringify(reference)} } },
        orderBy: { id: "asc" },
        select: { emailStatus: true },
      });
      await prisma.$disconnect();
      process.stdout.write(JSON.stringify(events));
    });
  `;
  return JSON.parse(
    execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
      env: { ...process.env, DATABASE_URL: "file:./data/e2e.db" },
      encoding: "utf8",
    }),
  );
}

export function renameOrderContact(reference: string, name: string) {
  runInE2eDb(`
    await prisma.order.update({
      where: { reference: ${JSON.stringify(reference)} },
      data: { contactName: ${JSON.stringify(name)} },
    });
  `);
}

export function setProductPrice(slug: string, priceCents: number) {
  runInE2eDb(`
    await prisma.product.update({
      where: { slug: ${JSON.stringify(slug)} },
      data: { priceCents: ${priceCents} },
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
