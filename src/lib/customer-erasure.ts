import { Prisma } from "@/generated/prisma/client";
import { orderStatus, type OrderStatus } from "@/lib/admin-orders";
import { contactEmailSchema } from "@/lib/orders";
import prisma from "@/lib/prisma";

export const ERASED_NAME = "Изтрит клиент";

const FINAL_STATUSES: OrderStatus[] = ["paid", "cancelled", "collected"];

export function isSettled(status: OrderStatus) {
  return FINAL_STATUSES.includes(status);
}

const PERSONAL_CHANGES = new Set(["name", "email", "phone"]);

export function erasedEmail(customerId: number) {
  return `erased-${customerId}@invalid`;
}

export type ErasedOrder = { reference: string; status: OrderStatus };

export type ErasureResult =
  { found: false } | { found: true; applied: boolean; orders: ErasedOrder[] };

function withoutPersonalChanges(changes: Prisma.JsonValue) {
  if (!Array.isArray(changes)) return Prisma.DbNull;

  const kept = changes.filter(
    (change) =>
      !(
        change &&
        typeof change === "object" &&
        !Array.isArray(change) &&
        PERSONAL_CHANGES.has(String(change.field))
      ),
  );

  return kept.length > 0 ? kept : Prisma.DbNull;
}

export function eraseCustomer(
  rawEmail: string,
  { apply, now = new Date() }: { apply: boolean; now?: Date },
): Promise<ErasureResult> {
  const parsed = contactEmailSchema.safeParse(rawEmail);
  if (!parsed.success) return Promise.resolve({ found: false });

  return prisma.$transaction(async (tx): Promise<ErasureResult> => {
    const customer = await tx.customer.findUnique({
      where: { email: parsed.data },
      select: {
        id: true,
        orders: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            reference: true,
            deliveryMethod: true,
            sentAt: true,
            paidAt: true,
            cancelledAt: true,
            collectedAt: true,
            events: {
              where: { changes: { not: Prisma.DbNull } },
              select: { id: true, changes: true },
            },
          },
        },
      },
    });
    if (!customer) return { found: false };

    const orders = customer.orders.map((order) => ({
      reference: order.reference,
      status: orderStatus(order),
    }));
    const open = orders.some((order) => !isSettled(order.status));
    if (!apply || open) return { found: true, applied: false, orders };

    const ofCustomer = { order: { customerId: customer.id } };

    await tx.customer.update({
      where: { id: customer.id },
      data: { name: ERASED_NAME, email: erasedEmail(customer.id), phone: "" },
    });
    await tx.order.updateMany({
      where: { customerId: customer.id },
      data: {
        contactName: ERASED_NAME,
        contactPhone: "",
        withdrawalName: null,
      },
    });
    await tx.consent.updateMany({
      where: ofCustomer,
      data: { ipAddress: null },
    });
    await tx.consent.updateMany({
      where: { ...ofCustomer, kind: "OFFERS", withdrawnAt: null },
      data: { withdrawnAt: now },
    });
    for (const event of customer.orders.flatMap((order) => order.events)) {
      await tx.orderEvent.update({
        where: { id: event.id },
        data: { changes: withoutPersonalChanges(event.changes) },
      });
    }

    return { found: true, applied: true, orders };
  });
}
