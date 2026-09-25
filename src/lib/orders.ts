import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { collapseDuplicates, MAX_LINE_QUANTITY, MAX_LINES } from "@/lib/cart";
import { CONSENT_WORDING } from "@/lib/consent";
import prisma from "@/lib/prisma";
import { takeToken } from "@/lib/rate-limit";

export const ORDER_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

export const checkoutInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  phone: z.string().trim().min(6).max(30),
  items: z
    .array(
      z.object({
        slug: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  officeCode: z.string().trim().min(1).max(50),
  acceptsTerms: z.literal(true),
  acceptsOffers: z.boolean(),
  idempotencyKey: z.uuid(),
  // Honeypot. Any value fails the order, so it is checked after parsing rather
  // than here, where the error would name the field that caught the bot.
  website: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export type PlacedOrder = {
  id: number;
  reference: string;
  itemsCents: number;
  deliveryCents: number;
  totalCents: number;
};

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder; repeated: boolean }
  | { ok: false; code: "VALIDATION_ERROR"; fields: string[] }
  | { ok: false; code: "UNAVAILABLE_ITEMS"; slugs: string[] }
  | { ok: false; code: "UNKNOWN_OFFICE" }
  | { ok: false; code: "REJECTED" };

// Two orders placed at the same moment compute the same number; the unique
// index refuses the second, and its retry reads the row that won.
const REFERENCE_ATTEMPTS = 5;

// The day is the owner's day, not UTC's: an order placed at 02:00 in Sofia
// belongs to the date he sees on the screen, not to the one before it.
const sofiaDayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
});

export function orderReferencePrefix(now: Date) {
  return `BP${sofiaDayMonth.format(now).replace(/\D/g, "")}`;
}

export function nextOrderReference(prefix: string, last: string | null) {
  const previous = last ? Number(last.slice(prefix.length)) : 0;
  const sequence =
    Number.isInteger(previous) && previous > 0 ? previous + 1 : 1;

  return `${prefix}${sequence}`;
}

function findByIdempotencyKey(idempotencyKey: string) {
  return prisma.order.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      reference: true,
      itemsCents: true,
      deliveryCents: true,
      totalCents: true,
    },
  });
}

// The libsql adapter reports the violated fields under driverAdapterError, not
// under the documented `target`, which it leaves undefined.
function conflictingFields(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  if (error.code !== "P2002") return [];

  const meta = error.meta as
    | {
        target?: string | string[];
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;

  const fields = meta?.driverAdapterError?.cause?.constraint?.fields;

  if (fields) return fields;
  if (Array.isArray(meta?.target)) return meta.target;

  return meta?.target ? [meta.target] : [];
}

export async function placeOrder(
  raw: unknown,
  ipAddress: string | null,
): Promise<PlaceOrderResult> {
  const parsed = checkoutInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      fields: [
        ...new Set(
          parsed.error.issues.map((issue) =>
            issue.path.length > 0 ? String(issue.path[0]) : "_root",
          ),
        ),
      ],
    };
  }

  const input = parsed.data;

  if (input.website) return { ok: false, code: "REJECTED" };

  if (ipAddress && !takeToken(`order:${ipAddress}`, ORDER_RATE_LIMIT)) {
    return { ok: false, code: "REJECTED" };
  }

  const existing = await findByIdempotencyKey(input.idempotencyKey);

  if (existing) {
    return { ok: true, order: existing, repeated: true };
  }

  // The same slug twice is summed rather than rejected, matching the cart, so a
  // stale tab cannot turn one basket into two lines of the same product.
  const items = collapseDuplicates(input.items);

  // Nothing the browser sent is priced or named here — only the slug and the
  // quantity survive validation, and both are re-checked against the database.
  const products = await prisma.product.findMany({
    where: {
      slug: { in: items.map((item) => item.slug) },
      isPublished: true,
      stock: { not: "NONE" },
      priceCents: { gt: 0 },
    },
    select: { id: true, slug: true, name: true, priceCents: true },
  });

  const sellable = new Map(products.map((product) => [product.slug, product]));
  const lines: {
    productId: number;
    slug: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }[] = [];
  const unavailable: string[] = [];

  for (const item of items) {
    const product = sellable.get(item.slug);

    if (!product) {
      unavailable.push(item.slug);
      continue;
    }

    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    });
  }

  if (unavailable.length > 0) {
    return { ok: false, code: "UNAVAILABLE_ITEMS", slugs: unavailable };
  }

  // The page was prerendered against an older snapshot, so the code it sends
  // is checked here rather than trusted.
  const office = await prisma.deliveryOffice.findUnique({
    where: { carrier_code: { carrier: "ECONT", code: input.officeCode } },
    select: { carrier: true, code: true, name: true, city: true, street: true },
  });

  if (!office) return { ok: false, code: "UNKNOWN_OFFICE" };

  const itemsCents = lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );
  // The office is chosen but not yet priced: a tariff arrives with B11, and
  // until then every order is priced as if delivery were free.
  const deliveryCents = 0;

  const consents: {
    kind: "TERMS" | "OFFERS";
    wording: string;
    ipAddress: string | null;
  }[] = [
    { kind: "TERMS", wording: CONSENT_WORDING.TERMS, ipAddress },
    ...(input.acceptsOffers
      ? [
          {
            kind: "OFFERS" as const,
            wording: CONSENT_WORDING.OFFERS,
            ipAddress,
          },
        ]
      : []),
  ];

  const prefix = orderReferencePrefix(new Date());

  for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { email: input.email },
          update: { name: input.name, phone: input.phone },
          create: { name: input.name, email: input.email, phone: input.phone },
          select: { id: true },
        });

        // The day's highest number, read by id rather than by date: the prefix
        // already narrows it to today, and the newest row holds the last one.
        const last = await tx.order.findFirst({
          where: { reference: { startsWith: prefix } },
          orderBy: { id: "desc" },
          select: { reference: true },
        });

        return tx.order.create({
          data: {
            customerId: customer.id,
            contactName: input.name,
            contactPhone: input.phone,
            officeCarrier: office.carrier,
            officeCode: office.code,
            officeName: office.name,
            officeCity: office.city,
            officeStreet: office.street,
            reference: nextOrderReference(prefix, last?.reference ?? null),
            itemsCents,
            deliveryCents,
            totalCents: itemsCents + deliveryCents,
            idempotencyKey: input.idempotencyKey,
            items: { create: lines },
            consents: { create: consents },
          },
          select: {
            id: true,
            reference: true,
            itemsCents: true,
            deliveryCents: true,
            totalCents: true,
          },
        });
      });

      return { ok: true, order, repeated: false };
    } catch (error) {
      const conflicts = conflictingFields(error);

      // The read above is a check-then-act; the unique index is what actually
      // stops a concurrent submission of the same key from writing twice.
      if (conflicts.includes("idempotencyKey")) {
        const winner = await findByIdempotencyKey(input.idempotencyKey);

        if (!winner) throw error;

        return { ok: true, order: winner, repeated: true };
      }

      // The order that won the number is committed by now, so the next attempt
      // reads it and takes the one after.
      if (!conflicts.includes("reference")) throw error;
    }
  }

  // Refused rather than thrown: a throw reaches the error boundary, which takes
  // the buyer's filled-in form with it.
  return { ok: false, code: "REJECTED" };
}
