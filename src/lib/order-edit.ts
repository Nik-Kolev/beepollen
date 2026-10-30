import { z } from "zod";

import { deliveryLabel, orderStatus } from "@/lib/admin-orders";
import { collapseDuplicates, MAX_LINE_QUANTITY, MAX_LINES } from "@/lib/cart";
import {
  DeliveryMethod,
  deliveryPrice,
  LOCAL_DELIVERY_CITY,
} from "@/lib/delivery";
import { findEcontOffice } from "@/lib/delivery-offices";
import { officeLabel } from "@/lib/econt";
import type { OrderChange } from "@/lib/order-change";
import {
  contactEmailSchema,
  contactNameSchema,
  contactPhoneSchema,
  invalidFields,
} from "@/lib/orders";
import prisma from "@/lib/prisma";

const lineSchema = z.object({
  slug: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const orderEditInput = z
  .object({
    reference: z.string().min(1).max(32),
    original: z.object({
      name: z.string().max(100),
      email: z.string().max(200),
      phone: z.string().max(30),
      deliveryMethod: z.enum(DeliveryMethod),
      officeCode: z.string().max(50),
      items: z.array(lineSchema).max(MAX_LINES),
    }),
    name: contactNameSchema,
    email: contactEmailSchema,
    phone: contactPhoneSchema,
    deliveryMethod: z.enum(DeliveryMethod),
    officeCode: z.string().trim().max(50),
    items: z.array(lineSchema).min(1).max(MAX_LINES),
  })
  .superRefine((input, ctx) => {
    if (input.deliveryMethod === "ECONT_OFFICE" && input.officeCode === "") {
      ctx.addIssue({ code: "custom", path: ["officeCode"], message: "" });
    }
  });

export const orderEditNotify = z.object({
  notify: z.boolean().optional(),
});

export type OrderEditResult =
  | {
      ok: true;
      reference: string;
      eventId: number | null;
      changes: OrderChange[];
      offersUnconfirmed: boolean;
    }
  | { ok: false; reason: "VALIDATION_ERROR"; fields: string[] }
  | { ok: false; reason: "UNAVAILABLE_ITEMS"; slugs: string[] }
  | { ok: false; reason: "UNKNOWN_OFFICE" | "stale" | "refused" };

type Line = { slug: string; quantity: number };

function sameLines(a: Line[], b: Line[]) {
  const quantities = new Map(a.map((line) => [line.slug, line.quantity]));
  return (
    a.length === b.length &&
    b.every((line) => quantities.get(line.slug) === line.quantity)
  );
}

function lineText(line: { name: string; quantity: number }) {
  return `${line.name} × ${line.quantity}`;
}

const NO_LINE = "—";

type OfficeSnapshot = {
  officeCarrier: "ECONT" | "SPEEDY" | null;
  officeCode: string | null;
  officeName: string | null;
  officeCity: string | null;
  officeStreet: string | null;
};

const NO_OFFICE: OfficeSnapshot = {
  officeCarrier: null,
  officeCode: null,
  officeName: null,
  officeCity: null,
  officeStreet: null,
};

function describeDelivery(
  order: OfficeSnapshot & { deliveryMethod: DeliveryMethod },
) {
  return order.deliveryMethod === DeliveryMethod.LOCAL
    ? deliveryLabel(order)
    : [
        order.officeName &&
          order.officeCity &&
          officeLabel(order.officeName, order.officeCity),
        order.officeStreet,
      ]
        .filter(Boolean)
        .join(", ");
}

class StaleEdit extends Error {}

export async function editOrderContact(
  raw: unknown,
  {
    now = new Date(),
    adminEmail = null,
    dryRun = false,
  }: { now?: Date; adminEmail?: string | null; dryRun?: boolean } = {},
): Promise<OrderEditResult> {
  const parsed = orderEditInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "VALIDATION_ERROR",
      fields: invalidFields(parsed.error.issues),
    };
  }
  const input = parsed.data;

  const order = await prisma.order.findUnique({
    where: { reference: input.reference },
    select: {
      id: true,
      customerId: true,
      customer: { select: { email: true } },
      contactName: true,
      contactPhone: true,
      deliveryMethod: true,
      officeCarrier: true,
      officeCode: true,
      officeName: true,
      officeCity: true,
      officeStreet: true,
      itemsCents: true,
      deliveryCents: true,
      totalCents: true,
      sentAt: true,
      paidAt: true,
      cancelledAt: true,
      collectedAt: true,
      withdrawnAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
    },
  });
  if (!order) return { ok: false, reason: "refused" };
  if (orderStatus(order) !== "new" || order.withdrawnAt) {
    return { ok: false, reason: "refused" };
  }

  const current = {
    name: order.contactName,
    email: order.customer.email,
    phone: order.contactPhone,
    deliveryMethod: order.deliveryMethod,
    officeCode: order.officeCode ?? "",
  };
  if (
    input.original.name !== current.name ||
    input.original.email !== current.email ||
    input.original.phone !== current.phone ||
    input.original.deliveryMethod !== current.deliveryMethod ||
    input.original.officeCode !== current.officeCode ||
    !sameLines(input.original.items, order.items)
  ) {
    return { ok: false, reason: "stale" };
  }

  const desired = collapseDuplicates(input.items);
  const existing = new Map(order.items.map((line) => [line.slug, line]));
  const raisedSlugs = desired
    .filter((line) => line.quantity > (existing.get(line.slug)?.quantity ?? 0))
    .map((line) => line.slug);
  const products =
    raisedSlugs.length > 0
      ? await prisma.product.findMany({
          where: {
            slug: { in: raisedSlugs },
            isPublished: true,
            stock: { not: "NONE" },
            priceCents: { gt: 0 },
          },
          select: { id: true, slug: true, name: true, priceCents: true },
        })
      : [];
  const sellable = new Map(products.map((product) => [product.slug, product]));
  const unavailable = raisedSlugs.filter((slug) => !sellable.has(slug));
  if (unavailable.length > 0) {
    return { ok: false, reason: "UNAVAILABLE_ITEMS", slugs: unavailable };
  }

  const kept = desired.flatMap((line) => {
    const was = existing.get(line.slug);
    return was ? [{ ...was, quantity: line.quantity, was }] : [];
  });
  const added = desired.flatMap((line) => {
    const product = existing.has(line.slug)
      ? undefined
      : sellable.get(line.slug);
    return product
      ? [
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            unitPriceCents: product.priceCents,
            quantity: line.quantity,
          },
        ]
      : [];
  });
  const removed = order.items.filter(
    (line) => !desired.some((wanted) => wanted.slug === line.slug),
  );
  const itemsCents = [...kept, ...added].reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );

  const officeCode =
    input.deliveryMethod === DeliveryMethod.ECONT_OFFICE
      ? input.officeCode
      : "";
  const deliveryChanged =
    input.deliveryMethod !== current.deliveryMethod ||
    officeCode !== current.officeCode;

  let office: OfficeSnapshot = {
    officeCarrier: order.officeCarrier,
    officeCode: order.officeCode,
    officeName: order.officeName,
    officeCity: order.officeCity,
    officeStreet: order.officeStreet,
  };
  if (deliveryChanged) {
    if (input.deliveryMethod === DeliveryMethod.ECONT_OFFICE) {
      const found = await findEcontOffice(officeCode);
      if (!found || found.city === LOCAL_DELIVERY_CITY) {
        return { ok: false, reason: "UNKNOWN_OFFICE" };
      }
      office = {
        officeCarrier: found.carrier,
        officeCode: found.code,
        officeName: found.name,
        officeCity: found.city,
        officeStreet: found.street,
      };
    } else {
      office = NO_OFFICE;
    }
  }

  const deliveryCents =
    input.deliveryMethod === current.deliveryMethod
      ? order.deliveryCents
      : deliveryPrice(input.deliveryMethod);
  const totalCents = itemsCents + deliveryCents;

  const changes: OrderChange[] = [];
  if (input.name !== current.name) {
    changes.push({ field: "name", from: current.name, to: input.name });
  }
  if (input.email !== current.email) {
    changes.push({ field: "email", from: current.email, to: input.email });
  }
  if (input.phone !== current.phone) {
    changes.push({ field: "phone", from: current.phone, to: input.phone });
  }
  if (deliveryChanged) {
    changes.push({
      field: "delivery",
      from: describeDelivery(order),
      to: describeDelivery({ ...office, deliveryMethod: input.deliveryMethod }),
    });
  }
  for (const line of kept) {
    if (line.quantity !== line.was.quantity) {
      changes.push({
        field: "item",
        from: lineText(line.was),
        to: lineText(line),
      });
    }
  }
  for (const line of removed) {
    changes.push({ field: "item", from: lineText(line), to: NO_LINE });
  }
  for (const line of added) {
    changes.push({ field: "item", from: NO_LINE, to: lineText(line) });
  }
  if (deliveryCents !== order.deliveryCents) {
    changes.push({
      field: "deliveryCents",
      from: order.deliveryCents,
      to: deliveryCents,
    });
  }
  if (totalCents !== order.totalCents) {
    changes.push({
      field: "totalCents",
      from: order.totalCents,
      to: totalCents,
    });
  }
  const linesChanged = changes.some((change) => change.field === "item");

  if (changes.length === 0 || dryRun) {
    return {
      ok: true,
      reference: input.reference,
      eventId: null,
      changes,
      offersUnconfirmed: false,
    };
  }

  const emailChanged = input.email !== current.email;

  try {
    const { eventId, offersUnconfirmed } = await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.upsert({
          where: { email: input.email },
          update: {
            ...(input.name !== current.name && { name: input.name }),
            ...(input.phone !== current.phone && { phone: input.phone }),
          },
          create: { name: input.name, email: input.email, phone: input.phone },
          select: { id: true },
        });

        const { count } = await tx.order.updateMany({
          where: {
            id: order.id,
            customerId: order.customerId,
            contactName: order.contactName,
            contactPhone: order.contactPhone,
            deliveryMethod: order.deliveryMethod,
            officeCode: order.officeCode,
            itemsCents: order.itemsCents,
            sentAt: null,
            paidAt: null,
            cancelledAt: null,
            collectedAt: null,
            withdrawnAt: null,
          },
          data: {
            customerId: customer.id,
            contactName: input.name,
            contactPhone: input.phone,
            deliveryMethod: input.deliveryMethod,
            ...office,
            itemsCents,
            deliveryCents,
            totalCents,
          },
        });
        if (count !== 1) throw new StaleEdit();

        if (linesChanged) {
          const lines = await tx.orderItem.findMany({
            where: { orderId: order.id },
            select: { slug: true, quantity: true },
          });
          if (!sameLines(lines, order.items)) throw new StaleEdit();
          await tx.orderItem.deleteMany({
            where: { id: { in: removed.map((line) => line.id) } },
          });
          for (const line of kept) {
            if (line.quantity !== line.was.quantity) {
              await tx.orderItem.update({
                where: { id: line.id },
                data: { quantity: line.quantity },
              });
            }
          }
          if (added.length > 0) {
            await tx.orderItem.createMany({
              data: added.map((line) => ({ ...line, orderId: order.id })),
            });
          }
        }

        const offers = emailChanged
          ? await tx.consent.findFirst({
              where: { orderId: order.id, kind: "OFFERS", withdrawnAt: null },
              select: {
                id: true,
                wording: true,
                ipAddress: true,
                createdAt: true,
              },
            })
          : null;
        if (offers) {
          await tx.consent.delete({ where: { id: offers.id } });
          await tx.consent.create({
            data: {
              orderId: order.id,
              kind: "OFFERS",
              wording: offers.wording,
              ipAddress: offers.ipAddress,
              createdAt: offers.createdAt,
            },
          });
        }

        if (customer.id !== order.customerId) {
          const remaining = await tx.order.count({
            where: { customerId: order.customerId },
          });
          if (remaining === 0) {
            await tx.customer.delete({ where: { id: order.customerId } });
          }
        }

        const event = await tx.orderEvent.create({
          data: {
            orderId: order.id,
            kind: "EDIT",
            adminEmail,
            changes,
            createdAt: now,
          },
          select: { id: true },
        });
        return { eventId: event.id, offersUnconfirmed: offers !== null };
      },
    );

    return {
      ok: true,
      reference: input.reference,
      eventId,
      changes,
      offersUnconfirmed,
    };
  } catch (error) {
    if (error instanceof StaleEdit) return { ok: false, reason: "stale" };
    throw error;
  }
}
