"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/lib/cart";
import { CONSENT_WORDING } from "@/lib/consent";
import { formatPrice } from "@/lib/money";
import type { CartProduct } from "@/lib/products";

const LABEL = "text-ink block text-sm font-medium";

const FIELD =
  "border-line focus:border-brand-deep mt-2 block min-h-11 w-full rounded-md border px-3 py-2 outline-none";

const CHECKBOX = "border-line mt-1 size-5 shrink-0 rounded-sm border";

function EmptyCheckout() {
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

// Mounts only once the cart has been read, so the key is minted in the browser
// and lasts exactly as long as this page does.
function FilledCheckout({
  items,
  products,
}: {
  items: CartItem[];
  products: CartProduct[];
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const catalogue = new Map(products.map((product) => [product.slug, product]));
  const lines = items.map(({ slug, quantity }) => ({
    slug,
    quantity,
    product: catalogue.get(slug),
  }));
  const totalCents = lines.reduce(
    (total, line) => total + (line.product?.priceCents ?? 0) * line.quantity,
    0,
  );
  const everyPriceKnown = lines.every(
    (line) => (line.product?.priceCents ?? 0) > 0,
  );

  return (
    <form noValidate className="mt-6 flex flex-col gap-10 lg:flex-row">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="flex flex-col gap-8 lg:flex-1">
        <section>
          <h2 className="text-lg font-semibold">Данни за връзка</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="name" className={LABEL}>
                Име и фамилия
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="email" className={LABEL}>
                Имейл
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="phone" className={LABEL}>
                Телефон
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className={FIELD}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Съгласия</h2>

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptsTerms"
                required
                className={CHECKBOX}
              />
              <span>{CONSENT_WORDING.TERMS}</span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptsOffers"
                className={CHECKBOX}
              />
              <span>{CONSENT_WORDING.OFFERS}</span>
            </label>
          </div>
        </section>

        {/* Nothing focusable reaches it, so any value came from a bot. */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </div>

      <section className="lg:w-80 lg:shrink-0">
        <h2 className="text-lg font-semibold">Вашата поръчка</h2>

        <ul
          role="list"
          className="border-line divide-line mt-4 divide-y border-y"
        >
          {lines.map(({ slug, quantity, product }) => (
            <li key={slug} className="flex items-start gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {product ? product.name : "Продуктът вече не се предлага"}
                </p>
                <p className="text-ink-soft mt-1 text-sm">
                  {product ? `${quantity} бр.` : slug}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">
                {product && product.priceCents > 0
                  ? formatPrice(product.priceCents * quantity)
                  : "TODO: цена"}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-center justify-between text-lg font-semibold">
          <span>Общо</span>
          <span className="text-brand-deep">
            {everyPriceKnown ? formatPrice(totalCents) : "TODO: цена"}
          </span>
        </p>

        <button
          type="submit"
          disabled
          className="bg-action text-action-ink disabled:bg-placeholder disabled:text-ink-soft mt-6 w-full rounded-md px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed"
        >
          Завърши поръчката
        </button>
      </section>
    </form>
  );
}

export function CheckoutForm({ products }: { products: CartProduct[] }) {
  const { cart, ready } = useCart();

  if (!ready) return <div className="py-10" aria-hidden="true" />;
  if (cart.items.length === 0) return <EmptyCheckout />;

  return <FilledCheckout items={cart.items} products={products} />;
}
