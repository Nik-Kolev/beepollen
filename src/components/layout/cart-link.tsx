"use client";

import Link from "next/link";

import { CartMark } from "@/components/art/cart-mark";
import { useCart } from "@/hooks/use-cart";
import { totalQuantity } from "@/lib/cart";

function CartIcon({ total }: { total: number }) {
  return (
    <span className="relative block">
      <CartMark className="size-9 sm:size-12" />

      <span
        aria-hidden="true"
        className="bg-action text-action-ink ring-nav absolute -top-0.5 -right-[4px] grid h-5 min-w-5 place-items-center rounded-full px-1 text-[13px] leading-none font-semibold ring-3"
      >
        {total > 99 ? "99+" : total}
      </span>
    </span>
  );
}

export function CartLink() {
  const { cart } = useCart();
  const total = totalQuantity(cart);

  return (
    <Link href="/cart" className="text-bee-dark relative ml-auto sm:ml-8">
      <CartIcon total={total} />

      <span className="sr-only">
        Количка{total > 0 ? `, ${total} бр.` : ", празна"}
      </span>
    </Link>
  );
}
