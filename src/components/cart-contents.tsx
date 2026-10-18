"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";

import { EmptyCart } from "@/components/empty-cart";
import { useCart } from "@/hooks/use-cart";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { blockedReason } from "@/lib/checkout-messages";
import { formatPrice } from "@/lib/money";
import type { CartProduct } from "@/lib/products";

const STEP_BUTTON =
  "border-ink-soft text-ink hover:border-ink grid size-11 place-items-center rounded-full border-2 text-lg leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 sm:size-9";

const REMOVE_BUTTON =
  "text-ink hover:text-brand-deep inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4 sm:min-h-0 sm:px-0";

export function CartContents({ products }: { products: CartProduct[] }) {
  const { cart, ready, setQuantity, remove } = useCart();
  const limitId = useId();
  const catalogue = new Map(products.map((product) => [product.slug, product]));

  if (!ready) return <div aria-hidden="true" />;
  if (cart.items.length === 0) return <EmptyCart />;

  const totalCents = cart.items.reduce((total, item) => {
    const product = catalogue.get(item.slug);

    return total + (product?.priceCents ?? 0) * item.quantity;
  }, 0);
  const everyPriceKnown = cart.items.every(
    (item) => (catalogue.get(item.slug)?.priceCents ?? 0) > 0,
  );
  const blocked = blockedReason(
    cart.items.map((item) => ({ product: catalogue.get(item.slug) })),
  );

  return (
    <div className="pt-6">
      <ul role="list" className="border-line divide-line divide-y border-y">
        {cart.items.map(({ slug, quantity }, index) => {
          const product = catalogue.get(slug);

          if (!product) {
            return (
              <li
                key={slug}
                className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
              >
                <p className="min-w-0 flex-1 font-medium">
                  Продуктът вече не се предлага
                </p>
                <button
                  type="button"
                  onClick={() => remove(slug)}
                  className={REMOVE_BUTTON}
                >
                  Премахни
                  <span className="sr-only">
                    {" "}
                    продукта, който вече не се предлага
                  </span>
                </button>
              </li>
            );
          }

          const [image] = product.images;
          const atLimit =
            quantity >= MAX_LINE_QUANTITY && product.stock !== "NONE";
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
                {product.stock === "NONE" && (
                  <p className="text-ink-soft mt-1 text-sm">Изчерпан</p>
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
                    disabled={quantity <= 1}
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
                    disabled={product.stock === "NONE"}
                    aria-disabled={atLimit}
                    aria-describedby={atLimit ? limitLineId : undefined}
                    className={STEP_BUTTON}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(slug)}
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
            {everyPriceKnown ? formatPrice(totalCents) : "TODO: цена"}
          </span>
        </p>

        {blocked ? (
          <p className="border-ink w-full border-l-4 pl-4 font-medium sm:w-auto sm:max-w-sm">
            {blocked}
          </p>
        ) : (
          <Link
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
