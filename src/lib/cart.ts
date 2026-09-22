import { z } from "zod";

export const CART_STORAGE_KEY = "beepollen.cart";

const CART_VERSION = 1;

export const MAX_LINE_QUANTITY = 99;

export const MAX_LINES = 50;

const cartSchema = z.object({
  version: z.literal(CART_VERSION),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .max(MAX_LINES),
});

export type Cart = z.infer<typeof cartSchema>;
export type CartItem = Cart["items"][number];

export const EMPTY_CART: Cart = { version: CART_VERSION, items: [] };

// A repeated slug is summed rather than rejected: rejecting empties the cart.
export function collapseDuplicates(items: CartItem[]): CartItem[] {
  const quantities = new Map<string, number>();

  for (const { slug, quantity } of items) {
    const total = (quantities.get(slug) ?? 0) + quantity;
    quantities.set(slug, Math.min(total, MAX_LINE_QUANTITY));
  }

  return [...quantities].map(([slug, quantity]) => ({ slug, quantity }));
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

export function addItem(cart: Cart, slug: string): Cart {
  const existing = cart.items.find((item) => item.slug === slug);

  if (!existing) {
    return { ...cart, items: [...cart.items, { slug, quantity: 1 }] };
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
