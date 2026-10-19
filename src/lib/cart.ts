import { z } from "zod";

import type { CartProduct } from "@/lib/products";

export const CART_STORAGE_KEY = "beepollen.cart";

const CART_VERSION = 2;

export const MAX_LINE_QUANTITY = 99;

export const MAX_LINES = 50;

const MAX_NAME_LENGTH = 200;

const cartSchema = z.object({
  version: z.literal(CART_VERSION),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1).max(MAX_NAME_LENGTH),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .max(MAX_LINES),
});

export type Cart = z.infer<typeof cartSchema>;
export type CartItem = Cart["items"][number];

export const EMPTY_CART: Cart = { version: CART_VERSION, items: [] };

export function collapseDuplicates<
  Item extends { slug: string; quantity: number },
>(items: Item[]): Item[] {
  const lines = new Map<string, Item>();

  for (const item of items) {
    const existing = lines.get(item.slug);

    lines.set(
      item.slug,
      existing
        ? {
            ...existing,
            quantity: Math.min(
              existing.quantity + item.quantity,
              MAX_LINE_QUANTITY,
            ),
          }
        : item,
    );
  }

  return [...lines.values()];
}

export function parseCart(raw: string | null): Cart {
  if (!raw) return EMPTY_CART;

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_CART;
  }

  const result = cartSchema.safeParse(value);

  if (!result.success) return EMPTY_CART;

  return {
    version: CART_VERSION,
    items: collapseDuplicates(result.data.items),
  };
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify(cart);
}

export function addItem(cart: Cart, slug: string, name: string): Cart {
  const existing = cart.items.find((item) => item.slug === slug);

  if (!existing) {
    return {
      ...cart,
      items: [
        ...cart.items,
        { slug, name: name.slice(0, MAX_NAME_LENGTH), quantity: 1 },
      ],
    };
  }

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.slug === slug
        ? { ...item, quantity: Math.min(item.quantity + 1, MAX_LINE_QUANTITY) }
        : item,
    ),
  };
}

export function setItemQuantity(
  cart: Cart,
  slug: string,
  quantity: number,
): Cart {
  const clamped = Math.min(Math.max(quantity, 1), MAX_LINE_QUANTITY);

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.slug === slug ? { ...item, quantity: clamped } : item,
    ),
  };
}

export function removeItem(cart: Cart, slug: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.slug !== slug) };
}

export function lineQuantity(cart: Cart, slug: string): number {
  return cart.items.find((item) => item.slug === slug)?.quantity ?? 0;
}

export function totalQuantity(cart: Cart): number {
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

type StockedLine = { product?: Pick<CartProduct, "stock"> };

type PricedLine = {
  quantity: number;
  product?: Pick<CartProduct, "priceCents" | "stock">;
};

export function isPurchasable<Line extends StockedLine>(
  line: Line,
): line is Line & { product: NonNullable<Line["product"]> } {
  return line.product !== undefined && line.product.stock !== "NONE";
}

export function purchasableTotal(lines: PricedLine[]): number | null {
  let total = 0;

  for (const line of lines) {
    if (!isPurchasable(line)) continue;

    const { priceCents } = line.product;

    if (priceCents <= 0) return null;
    total += priceCents * line.quantity;
  }

  return total;
}
