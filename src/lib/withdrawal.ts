import { z } from "zod";

import type { OrderChange } from "@/lib/order-change";
import {
  contactEmailSchema,
  contactNameSchema,
  contactPhoneSchema,
  invalidFields,
} from "@/lib/orders";
import prisma from "@/lib/prisma";
import { rateLimitSubject, takeToken, takeTokens } from "@/lib/rate-limit";

export const WITHDRAWAL_RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };

export const UNMATCHED_OWNER_CAP = { limit: 10, windowMs: 24 * 60 * 60 * 1000 };

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
  extra_info: z.string().optional(),
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

export type WithdrawalOutcome =
  | WithdrawalResult
  | { ok: false; code: "UNMATCHED"; eventId: number; notifyOwner: boolean };

export function publicWithdrawalResult(
  outcome: WithdrawalOutcome,
): WithdrawalResult {
  return !outcome.ok && outcome.code === "UNMATCHED"
    ? { ok: false, code: "NOT_FOUND" }
    : outcome;
}

export async function withdrawFromOrder(
  raw: unknown,
  ipAddress: string | null,
  now = new Date(),
): Promise<WithdrawalOutcome> {
  const parsed = withdrawalInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: invalidFields(parsed.error.issues),
    };
  }

  const input = parsed.data;

  if (input.extra_info) return { ok: false, code: "REJECTED" };

  if (
    ipAddress &&
    !takeToken(
      `withdrawal:${rateLimitSubject(ipAddress)}`,
      WITHDRAWAL_RATE_LIMIT,
    )
  ) {
    return { ok: false, code: "REJECTED" };
  }

  const order = await prisma.order.findUnique({
    where: { reference: input.reference },
    select: {
      id: true,
      reference: true,
      contactName: true,
      contactPhone: true,
      sentAt: true,
      withdrawnAt: true,
      cancelledAt: true,
      customer: { select: { email: true } },
    },
  });

  if (!order || order.contactPhone === "") {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (
    order.contactPhone !== input.phone ||
    order.customer.email !== input.email
  ) {
    const changes: OrderChange[] = [
      { field: "name", from: order.contactName, to: input.name },
      { field: "phone", from: order.contactPhone, to: input.phone },
      { field: "email", from: order.customer.email, to: input.email },
    ];
    const { eventId, first } = await prisma.$transaction(async (tx) => {
      const earlier = await tx.orderEvent.count({
        where: { orderId: order.id, kind: "WITHDRAWAL_UNMATCHED" },
      });
      const event = await tx.orderEvent.create({
        data: {
          orderId: order.id,
          kind: "WITHDRAWAL_UNMATCHED",
          changes,
          createdAt: now,
        },
        select: { id: true },
      });
      return { eventId: event.id, first: earlier === 0 };
    });
    const open = !order.withdrawnAt && !order.cancelledAt;
    const notifyOwner =
      first &&
      open &&
      takeTokens(
        [{ key: "withdrawal-unmatched-owner", options: UNMATCHED_OWNER_CAP }],
        now.getTime(),
      );
    return { ok: false, code: "UNMATCHED", eventId, notifyOwner };
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
