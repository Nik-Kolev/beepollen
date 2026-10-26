import { z } from "zod";

import {
  contactEmailSchema,
  contactNameSchema,
  contactPhoneSchema,
  invalidFields,
} from "@/lib/orders";
import prisma from "@/lib/prisma";
import { takeToken } from "@/lib/rate-limit";

export const WITHDRAWAL_RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };

export const withdrawalInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .max(32)
    .regex(/^BP\d{7,}$/),
  name: contactNameSchema,
  email: contactEmailSchema,
  phone: contactPhoneSchema,
  website: z.string().optional(),
});

export type WithdrawalResult =
  | {
      ok: true;
      reference: string;
      withdrawnAt: Date;
      repeated: boolean;
      sent: boolean;
    }
  | { ok: false; code: "VALIDATION_ERROR"; fields: string[] }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "REJECTED" };

export async function withdrawFromOrder(
  raw: unknown,
  ipAddress: string | null,
  now = new Date(),
): Promise<WithdrawalResult> {
  const parsed = withdrawalInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: invalidFields(parsed.error.issues),
    };
  }

  const input = parsed.data;

  if (input.website) return { ok: false, code: "REJECTED" };

  if (
    ipAddress &&
    !takeToken(`withdrawal:${ipAddress}`, WITHDRAWAL_RATE_LIMIT)
  ) {
    return { ok: false, code: "REJECTED" };
  }

  const order = await prisma.order.findUnique({
    where: { reference: input.reference },
    select: {
      id: true,
      reference: true,
      contactPhone: true,
      sentAt: true,
      withdrawnAt: true,
      customer: { select: { email: true } },
    },
  });

  if (
    !order ||
    order.contactPhone !== input.phone ||
    order.customer.email !== input.email
  ) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (order.withdrawnAt) {
    return {
      ok: true,
      reference: order.reference,
      withdrawnAt: order.withdrawnAt,
      repeated: true,
      sent: order.sentAt !== null,
    };
  }

  const recorded = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { reference: order.reference, withdrawnAt: null },
      data: { withdrawnAt: now, withdrawalName: input.name },
    });
    if (count !== 1) return null;

    await tx.orderEvent.create({
      data: { orderId: order.id, kind: "WITHDRAWN", createdAt: now },
    });
    return tx.order.findUniqueOrThrow({
      where: { reference: order.reference },
      select: { sentAt: true },
    });
  });

  if (recorded) {
    return {
      ok: true,
      reference: order.reference,
      withdrawnAt: now,
      repeated: false,
      sent: recorded.sentAt !== null,
    };
  }

  const current = await prisma.order.findUniqueOrThrow({
    where: { reference: order.reference },
    select: { sentAt: true, withdrawnAt: true },
  });

  if (!current.withdrawnAt) throw new Error("withdrawnAt cleared mid-request");

  return {
    ok: true,
    reference: order.reference,
    withdrawnAt: current.withdrawnAt,
    repeated: true,
    sent: current.sentAt !== null,
  };
}
