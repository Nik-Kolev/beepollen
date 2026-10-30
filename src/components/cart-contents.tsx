"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { EmptyCart } from "@/components/empty-cart";
import { useCart } from "@/hooks/use-cart";
import {
  CART_STORAGE_KEY,
  CART_VERSION,
  isPurchasable,
  MAX_LINE_QUANTITY,
  MAX_LINES,
  purchasableTotal,
} from "@/lib/cart";
import { blockedReason } from "@/lib/checkout-messages";
import { formatPrice } from "@/lib/money";
import type { CartProduct } from "@/lib/products";

const STEP_BUTTON =
  "border-ink-soft text-ink hover:border-ink grid size-11 place-items-center rounded-full border-2 text-lg leading-none transition-colors aria-disabled:cursor-not-allowed aria-disabled:border-ink-soft/40 aria-disabled:text-ink/40 sm:size-9";

const REMOVE_BUTTON =
  "text-ink hover:text-brand-deep inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4 sm:min-h-0 sm:px-0";

const RESERVED_HEIGHT =
  "[--cart-empty:315.3px] [--cart-first:41.8px] [--cart-row:197px] sm:[--cart-empty:291.3px] sm:[--cart-first:-9.3px] sm:[--cart-row:169px] h-[calc(var(--cart-empty)_+_min(var(--cart-lines,0),1)_*_var(--cart-first)_+_max(var(--cart-lines,0)_-_1,0)_*_var(--cart-row))]";

const RESERVE_LINES = `try {
  const cart = JSON.parse(localStorage.getItem(${JSON.stringify(CART_STORAGE_KEY)}));
  const lines = cart && cart.version === ${CART_VERSION} && Array.isArray(cart.items)
    ? Math.min(new Set(cart.items.map((item) => item && item.slug)).size, ${MAX_LINES})
    : 0;
  const style = document.createElement("style");
  style.textContent = ":root{--cart-lines:" + lines + "}";
  document.head.append(style);
} catch {}`;

export function CartContents({ products }: { products: CartProduct[] }) {
  const { cart, ready, setQuantity, remove } = useCart();
  const limitId = useId();
  const catalogue = new Map(products.map((product) => [product.slug, product]));
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const checkoutLink = useRef<HTMLAnchorElement>(null);
  const emptyHeading = useRef<HTMLHeadingElement>(null);
  const focusAfterRemove = useRef<
    (() => HTMLElement | null | undefined) | null
  >(null);

  useEffect(() => {
    focusAfterRemove.current?.()?.focus();
    focusAfterRemove.current = null;
  }, [cart.items]);

  if (!ready) {
    return (
      <div aria-hidden="true" className={RESERVED_HEIGHT}>
        <script dangerouslySetInnerHTML={{ __html: RESERVE_LINES }} />
      </div>
    );
  }
  if (cart.items.length === 0) return <EmptyCart headingRef={emptyHeading} />;

  const lines = cart.items.map((item) => ({
    ...item,
    product: catalogue.get(item.slug),
  }));
  const totalCents = purchasableTotal(lines);
  const blocked = blockedReason(lines);

  function removeLine(index: number) {
    const rest = lines.filter((_, other) => other !== index);
    const next = rest[index] ?? rest[index - 1];

    focusAfterRemove.current = !next
      ? () => emptyHeading.current
      : blocked && !blockedReason(rest)
        ? () => checkoutLink.current
        : () => removeButtons.current.get(next.slug);
    remove(lines[index].slug);
  }

  function removeButtonRef(slug: string) {
    return (button: HTMLButtonElement) => {
      removeButtons.current.set(slug, button);
      return () => {
        removeButtons.current.delete(slug);
      };
    };
  }

  return (
    <div className="pt-6">
      <ul role="list" className="border-line divide-line divide-y border-y">
        {lines.map((line, index) => {
          if (!isPurchasable(line)) {
            const name = line.product?.name ?? line.name;

            return (
              <li
                key={line.slug}
                className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{name}</h2>
                  <p className="text-ink-soft mt-1 text-sm">
                    {line.product ? "Изчерпан" : "Вече не се предлага"}
                  </p>
                </div>
                <button
                  ref={removeButtonRef(line.slug)}
                  type="button"
                  onClick={() => removeLine(index)}
                  className={REMOVE_BUTTON}
                >
                  Премахни
                  <span className="sr-only"> {name}</span>
                </button>
              </li>
            );
          }

          const { slug, quantity, product } = line;
          const [image] = product.images;
          const atLimit = quantity >= MAX_LINE_QUANTITY;
          const limitLineId = `${limitId}-${slug}`;

          return (
            <li
              key={slug}
              className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
            >
              <div className="bg-placeholder relative size-24 shrink-0 overflow-hidden rounded-md sm:size-32">
                {image && (
                  <Image
                    src={image.path}
                    alt={image.alt}
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    sizes="(min-width: 640px) 128px, 96px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-medium">
                  <Link
                    href={`/products/${slug}`}
                    className="hover:text-brand-deep transition-colors"
                  >
                    {product.name}
                  </Link>
                </h2>
                <p className="text-brand-deep mt-1 font-semibold">
                  {product.priceCents > 0
                    ? `${formatPrice(product.priceCents)} / бр.`
                    : "TODO: цена"}
                </p>
                {product.priceCents > 0 && quantity > 1 && (
                  <p className="text-ink-soft mt-1 text-sm tabular-nums">
                    {quantity} × {formatPrice(product.priceCents)} ={" "}
                    <span className="text-ink font-semibold">
                      {formatPrice(product.priceCents * quantity)}
                    </span>
                  </p>
                )}
                <p
                  id={limitLineId}
                  role="status"
                  className={`text-ink-soft text-sm ${atLimit ? "mt-1" : ""}`}
                >
                  {atLimit ? "Това е максимумът за един продукт." : ""}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-6 sm:w-auto">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Намали количеството на ${product.name}`}
                    onClick={() => setQuantity(slug, quantity - 1)}
                    aria-disabled={quantity <= 1}
                    className={STEP_BUTTON}
                  >
                    −
                  </button>
                  <span className="w-6 text-center tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Увеличи количеството на ${product.name}`}
                    onClick={() => setQuantity(slug, quantity + 1)}
                    aria-disabled={atLimit}
                    aria-describedby={atLimit ? limitLineId : undefined}
                    className={STEP_BUTTON}
                  >
                    +
                  </button>
                </div>

                <button
                  ref={removeButtonRef(slug)}
                  type="button"
                  onClick={() => removeLine(index)}
                  className={REMOVE_BUTTON}
                >
                  Премахни
                  <span className="sr-only"> {product.name}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold">
          Общо:{" "}
          <span className="text-brand-deep">
            {totalCents === null ? "TODO: цена" : formatPrice(totalCents)}
          </span>
        </p>

        {blocked ? (
          <p className="border-ink w-full border-l-4 pl-4 font-medium sm:w-auto sm:max-w-sm">
            {blocked}
          </p>
        ) : (
          <Link
            ref={checkoutLink}
            href="/checkout"
            className="bg-action text-action-ink hover:bg-action-hover inline-flex min-h-14 w-full items-center justify-center rounded-full px-8 text-lg font-semibold transition-colors sm:w-auto"
          >
            Към поръчката
          </Link>
        )}
      </div>
    </div>
  );
}
