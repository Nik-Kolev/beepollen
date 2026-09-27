"use client";

import { useEffect, useRef, useState } from "react";

import { useCart } from "@/hooks/use-cart";
import { lineQuantity, MAX_LINE_QUANTITY } from "@/lib/cart";

const ADDED_MS = 1200;

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

  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const pending = timer;

    return () => window.clearTimeout(pending.current);
  }, []);

  function handleAdd() {
    if (timer.current !== undefined) return;

    add(slug);
    setAdded(true);

    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setAdded(false);
    }, ADDED_MS);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut || full}
        aria-disabled={added}
        className={`${added ? "bg-leaf hover:bg-leaf" : "bg-action hover:bg-action-hover"} text-action-ink disabled:bg-placeholder disabled:text-ink-soft grid w-full rounded-md px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed sm:w-auto sm:self-start`}
      >
        <span className={`col-start-1 row-start-1 ${added ? "opacity-0" : ""}`}>
          {soldOut ? "Изчерпан" : "Добави в количката"}
        </span>

        <span
          aria-hidden="true"
          className={`col-start-1 row-start-1 ${added ? "" : "invisible"}`}
        >
          Добавено <span className="ml-1.5">✓</span>
        </span>
      </button>

      <p role="status" className="text-ink-soft mt-2 text-sm">
        {quantity > 0 ? `${quantity} бр. в количката` : ""}
      </p>
    </div>
  );
}
