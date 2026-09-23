"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import { submitOrder } from "@/app/checkout/actions";
import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/lib/cart";
import { CONSENT_WORDING } from "@/lib/consent";
import { formatPrice } from "@/lib/money";
import type { PlaceOrderResult, PlacedOrder } from "@/lib/orders";
import type { CartProduct } from "@/lib/products";

const LABEL = "text-ink block text-sm font-medium";

const FIELD =
  "border-line focus:border-brand-deep mt-2 block min-h-11 w-full rounded-md border px-3 py-2 outline-none";

const FIELD_INVALID =
  "border-ink focus:border-brand-deep mt-2 block min-h-11 w-full rounded-md border-2 px-3 py-2 outline-none";

const CHECKBOX = "border-line mt-1 size-5 shrink-0 rounded-sm border";

const ERROR_TEXT = "text-ink mt-2 text-sm font-medium";

const FIELD_ERROR: Record<string, string> = {
  name: "Въведете име между 2 и 100 знака.",
  email: "Въведете валиден имейл адрес.",
  phone: "Въведете телефон между 6 и 30 знака.",
  acceptsTerms: "Трябва да приемете общите условия, за да продължите.",
};

const INCOMPLETE_ORDER =
  "Данните на поръчката не са пълни. Презаредете страницата и опитайте отново.";

const UNAVAILABLE_LINES =
  "Отбелязаните продукти вече не се предлагат. Премахнете ги, за да продължите.";

const WITHDRAWN_LINES =
  "Премахнете продуктите, които вече не се предлагат, за да продължите.";

const MISSING_PRICE =
  "Продукт в количката все още няма цена, затова поръчката не може да бъде завършена.";

// Deliberately says nothing about which check refused it.
const REFUSED =
  "Поръчката не може да бъде приета в момента. Опитайте по-късно.";

type Answers = {
  name: string;
  email: string;
  phone: string;
  acceptsTerms: boolean;
  acceptsOffers: boolean;
};

const EMPTY_ANSWERS: Answers = {
  name: "",
  email: "",
  phone: "",
  acceptsTerms: false,
  acceptsOffers: false,
};

// Pinned to the result it answers, so a newer refusal makes it stale by
// identity rather than needing an effect to clear it.
type Corrected = { of: PlaceOrderResult | null; fields: Set<string> };

const NOTHING_CORRECTED: Corrected = { of: null, fields: new Set() };

function summaryError(
  result: PlaceOrderResult | null,
  stillUnavailable: boolean,
) {
  if (!result || result.ok) return null;
  if (result.code === "REJECTED") return REFUSED;
  if (result.code === "UNAVAILABLE_ITEMS") {
    return stillUnavailable ? UNAVAILABLE_LINES : null;
  }

  // A field the form cannot mark would otherwise be refused in silence.
  return result.fields.every((field) => field in FIELD_ERROR)
    ? null
    : INCOMPLETE_ORDER;
}

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

function OrderPlaced({ order }: { order: PlacedOrder }) {
  const heading = useRef<HTMLHeadingElement>(null);

  // The form it replaced is gone, so focus would otherwise fall to the body.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="py-10">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">
        Поръчката е приета
      </h2>
      <p className="mt-4">
        Номер на поръчката:{" "}
        <strong className="text-brand-deep">{order.reference}</strong>
      </p>
      <p className="text-ink-soft mt-2">
        Ще се свържем с вас до 24 часа за потвърждение.
      </p>
      <p className="mt-4 text-lg font-semibold">
        Общо: {formatPrice(order.totalCents)}
      </p>
      <Link
        href="/"
        className="text-brand-deep mt-6 inline-block font-medium underline underline-offset-4"
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
  answers,
  setAnswers,
  corrected,
  setCorrected,
  result,
  pending,
  formAction,
  onRemove,
}: {
  items: CartItem[];
  products: CartProduct[];
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
  corrected: Corrected;
  setCorrected: Dispatch<SetStateAction<Corrected>>;
  result: PlaceOrderResult | null;
  pending: boolean;
  formAction: (formData: FormData) => void;
  onRemove: (slug: string) => void;
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
  // A line the catalogue no longer carries and a line with no price both fail
  // the order service, so the page says which rather than letting it round trip.
  const withdrawn = lines.some((line) => !line.product);
  const blocked = withdrawn
    ? WITHDRAWN_LINES
    : everyPriceKnown
      ? null
      : MISSING_PRICE;

  const correctedFields =
    corrected.of === result ? corrected.fields : new Set<string>();
  const reported =
    result && !result.ok && result.code === "VALIDATION_ERROR"
      ? result.fields
      : [];
  const invalid = new Set(
    reported.filter((field) => !correctedFields.has(field)),
  );
  const unavailable =
    result && !result.ok && result.code === "UNAVAILABLE_ITEMS"
      ? new Set(result.slugs)
      : new Set<string>();
  const stillUnavailable = lines.some((line) => unavailable.has(line.slug));
  const summary = summaryError(result, stillUnavailable);

  function fieldProps(name: string) {
    return invalid.has(name)
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {};
  }

  function fieldClass(name: string) {
    return invalid.has(name) ? FIELD_INVALID : FIELD;
  }

  function markCorrected(field: string) {
    setCorrected((current) => ({
      of: result,
      fields:
        current.of === result
          ? new Set(current.fields).add(field)
          : new Set([field]),
    }));
  }

  function onAnswerChange(field: keyof Answers) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value, checked, type } = event.target;

      markCorrected(field);
      setAnswers((current) => ({
        ...current,
        [field]: type === "checkbox" ? checked : value,
      }));
    };
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        // Submitted by hand rather than through the action prop, because that
        // resets the form and throws away the fields the buyer got right.
        const submitted = new FormData(event.currentTarget);

        startTransition(() => formAction(submitted));
      }}
      className="mt-6 flex flex-col gap-10 lg:flex-row"
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex flex-col gap-8 lg:flex-1">
        {summary && (
          <p
            role="alert"
            className="border-ink text-ink border-l-4 pl-4 font-medium"
          >
            {summary}
          </p>
        )}

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
                value={answers.name}
                onChange={onAnswerChange("name")}
                className={fieldClass("name")}
                {...fieldProps("name")}
              />
              {invalid.has("name") && (
                <p id="name-error" className={ERROR_TEXT}>
                  {FIELD_ERROR.name}
                </p>
              )}
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
                value={answers.email}
                onChange={onAnswerChange("email")}
                className={fieldClass("email")}
                {...fieldProps("email")}
              />
              {invalid.has("email") && (
                <p id="email-error" className={ERROR_TEXT}>
                  {FIELD_ERROR.email}
                </p>
              )}
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
                value={answers.phone}
                onChange={onAnswerChange("phone")}
                className={fieldClass("phone")}
                {...fieldProps("phone")}
              />
              {invalid.has("phone") && (
                <p id="phone-error" className={ERROR_TEXT}>
                  {FIELD_ERROR.phone}
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Съгласия</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptsTerms"
                  required
                  checked={answers.acceptsTerms}
                  onChange={onAnswerChange("acceptsTerms")}
                  className={CHECKBOX}
                  {...fieldProps("acceptsTerms")}
                />
                <span>{CONSENT_WORDING.TERMS}</span>
              </label>
              {invalid.has("acceptsTerms") && (
                <p id="acceptsTerms-error" className={ERROR_TEXT}>
                  {FIELD_ERROR.acceptsTerms}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptsOffers"
                checked={answers.acceptsOffers}
                onChange={onAnswerChange("acceptsOffers")}
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
                {(unavailable.has(slug) || !product) && (
                  <button
                    type="button"
                    onClick={() => onRemove(slug)}
                    className="text-ink hover:text-brand-deep mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 sm:min-h-0"
                  >
                    Премахни
                    <span className="sr-only"> {product?.name ?? slug}</span>
                  </button>
                )}
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
          disabled={pending || blocked !== null}
          className="bg-action text-action-ink disabled:bg-placeholder disabled:text-ink-soft mt-6 w-full rounded-md px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {pending ? "Изпращане…" : "Завърши поръчката"}
        </button>

        {blocked && <p className={ERROR_TEXT}>{blocked}</p>}
      </section>
    </form>
  );
}

// The answers live here rather than in the form, so emptying the cart -- by
// removing the last line, or from another tab -- cannot discard what was typed.
export function CheckoutForm({ products }: { products: CartProduct[] }) {
  const { cart, ready, remove, clear } = useCart();
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [corrected, setCorrected] = useState(NOTHING_CORRECTED);
  const [result, formAction, pending] = useActionState(submitOrder, null);
  const placed = result?.ok ? result.order : null;

  useEffect(() => {
    if (placed) clear();
  }, [placed, clear]);

  if (placed) return <OrderPlaced order={placed} />;
  if (!ready) return <div className="py-10" aria-hidden="true" />;
  if (cart.items.length === 0) return <EmptyCheckout />;

  return (
    <FilledCheckout
      items={cart.items}
      products={products}
      answers={answers}
      setAnswers={setAnswers}
      corrected={corrected}
      setCorrected={setCorrected}
      result={result}
      pending={pending}
      formAction={formAction}
      onRemove={remove}
    />
  );
}
