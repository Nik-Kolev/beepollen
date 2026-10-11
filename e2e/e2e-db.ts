import { execFileSync } from "node:child_process";

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
