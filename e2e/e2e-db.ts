import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export function placeLocalOrder(email: string, phone: string) {
  const input = {
    name: "Отказ Тестов",
    email,
    phone,
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    deliveryMethod: "LOCAL",
    officeCode: "",
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
    env: { ...process.env, DATABASE_URL: "file:./data/e2e.db" },
    encoding: "utf8",
  });
}

export function backdateOrderSteps(reference: string, hoursAgo: number) {
  const at = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const script = `
    import("@/lib/prisma").then(async (module) => {
      const prisma = module.default.default ?? module.default;
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
      await prisma.$disconnect();
    });
  `;
  execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
    env: { ...process.env, DATABASE_URL: "file:./data/e2e.db" },
    stdio: "inherit",
  });
}
