"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/hooks/use-cart";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import type { CartProduct } from "@/lib/products";

const STEP_BUTTON =
  "border-line text-ink hover:border-brand-deep grid size-11 place-items-center rounded-md border text-lg leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:size-9";

const REMOVE_BUTTON =
  "text-ink-soft hover:text-brand-deep inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4 sm:min-h-0 sm:px-0";

function EmptyCart() {
  return (
    <div className="py-10">
      <p className="text-ink-soft">Количката е празна.</p>
      <Link
        href="/"
        className="text-brand-deep mt-4 inline-block font-medium underline underline-offset-4"
      >
        Към продуктите
      </Link>
    </div>
  );
}

export function CartContents({ products }: { products: CartProduct[] }) {
  const { cart, ready, setQuantity, remove } = useCart();
  const catalogue = new Map(products.map((product) => [product.slug, product]));

  if (!ready) return <div className="py-10" aria-hidden="true" />;
  if (cart.items.length === 0) return <EmptyCart />;

  const totalCents = cart.items.reduce((total, item) => {
    const product = catalogue.get(item.slug);

    return total + (product?.priceCents ?? 0) * item.quantity;
  }, 0);
  const everyPriceKnown = cart.items.every(
    (item) => (catalogue.get(item.slug)?.priceCents ?? 0) > 0,
  );

  return (
    <div className="mt-6">
      <ul role="list" className="border-line divide-line divide-y border-y">
        {cart.items.map(({ slug, quantity }, index) => {
          const product = catalogue.get(slug);

          if (!product) {
            return (
              <li
                key={slug}
                className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Продуктът вече не се предлага</p>
                  <p className="text-ink-soft mt-1 text-sm">{slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(slug)}
                  className={REMOVE_BUTTON}
                >
                  Премахни
                  <span className="sr-only"> {slug}</span>
                </button>
              </li>
            );
          }

          const [image] = product.images;

          return (
            <li
              key={slug}
              className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap"
            >
              <div className="bg-placeholder relative size-20 shrink-0 overflow-hidden rounded-md">
                {image && (
                  <Image
                    src={image.path}
                    alt={image.alt}
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    sizes="80px"
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
                    ? formatPrice(product.priceCents)
                    : "TODO: цена"}
                </p>
                {product.stock === "NONE" && (
                  <p className="text-ink-soft mt-1 text-sm">Изчерпан</p>
                )}
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
                    disabled={
                      quantity >= MAX_LINE_QUANTITY || product.stock === "NONE"
                    }
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

        <Link
          href="/checkout"
          className="bg-action text-action-ink w-full rounded-md px-6 py-3 text-center text-sm font-semibold sm:w-auto"
        >
          Към поръчката
        </Link>
      </div>
    </div>
  );
}
