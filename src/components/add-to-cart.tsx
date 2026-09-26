"use client";

import { useCart } from "@/hooks/use-cart";
import { lineQuantity, MAX_LINE_QUANTITY } from "@/lib/cart";

export function AddToCart({
  slug,
  soldOut,
}: {
  slug: string;
  soldOut: boolean;
}) {
  const { cart, add } = useCart();
  const quantity = lineQuantity(cart, slug);
  const full = quantity >= MAX_LINE_QUANTITY;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => add(slug)}
        disabled={soldOut || full}
        className="bg-action text-action-ink hover:bg-action-hover disabled:bg-placeholder disabled:text-ink-soft w-full rounded-md px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed sm:w-auto sm:self-start"
      >
        {soldOut ? "Изчерпан" : "Добави в количката"}
      </button>

      <p role="status" className="text-ink-soft mt-2 text-sm">
        {quantity > 0 ? `${quantity} бр. в количката` : ""}
      </p>
    </div>
  );
}
