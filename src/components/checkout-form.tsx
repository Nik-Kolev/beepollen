"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

import { submitOrder } from "@/app/(shop)/checkout/actions";
import { OfficeCityPicker } from "@/components/delivery/office-city-picker";
import { EmptyCart } from "@/components/empty-cart";
import {
  ERROR_TEXT,
  FIELD,
  FIELD_INVALID,
  INPUT_ERROR_TEXT,
  LABEL,
} from "@/components/form-styles";
import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/lib/cart";
import {
  blockedReason,
  FIELD_ERROR,
  summaryError,
} from "@/lib/checkout-messages";
import { CONSENT_WORDING } from "@/lib/consent";
import { deliveryPrice, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import type { EcontOffice } from "@/lib/econt";
import { formatPrice } from "@/lib/money";
import type { PlaceOrderResult, PlacedOrder } from "@/lib/orders";
import type { CartProduct } from "@/lib/products";
import { OWNER_PHONE } from "@/lib/site";

const CHECKBOX = "accent-action size-5 shrink-0";

const CHECKBOX_LABEL = "flex min-h-11 items-center gap-3 text-sm";

const CONSENT_BOX = "border-line bg-ground rounded-lg border px-4 py-2";

const LEGAL_LINK = "underline underline-offset-4 hover:no-underline";

const CARD = "bg-surface ring-line rounded-xl p-5 shadow-sm ring-1 sm:p-6";

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <h2
        id={headingId}
        className="flex items-center gap-3 text-lg font-semibold"
      >
        <span
          aria-hidden="true"
          className="bg-action text-action-ink grid size-8 shrink-0 place-items-center rounded-full text-sm"
        >
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

type Answers = {
  name: string;
  email: string;
  phone: string;
  localDelivery: boolean;
  acceptsTerms: boolean;
  acceptsOffers: boolean;
};

const EMPTY_ANSWERS: Answers = {
  name: "",
  email: "",
  phone: "",
  localDelivery: false,
  acceptsTerms: false,
  acceptsOffers: false,
};

type Corrected = { of: PlaceOrderResult | null; fields: Set<string> };

const NOTHING_CORRECTED: Corrected = { of: null, fields: new Set() };

const DISPATCH_NOTE =
  "Изпращаме в деня на поръчката или на следващия ден. Колко бързо ще пристигне, зависи от куриера. Ако има промяна, ще се свържем с вас.";

function OrderPlaced({
  order,
  office,
}: {
  order: PlacedOrder;
  office: EcontOffice | null;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="py-10">
      <div className={`${CARD} mx-auto max-w-xl text-center`}>
        <p className="text-brand-deep text-2xl font-semibold sm:text-3xl">
          Благодарим за поръчката!
        </p>
        <h2 ref={heading} tabIndex={-1} className="mt-2 text-lg font-semibold">
          Поръчката е приета
        </h2>
        <dl className="mt-6 flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <dt className="text-ink-soft">Номер на поръчката:</dt>
            <dd className="font-semibold">{order.reference}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-ink-soft">Общо:</dt>
            <dd className="text-brand-deep text-lg font-semibold">
              {formatPrice(order.totalCents)}
            </dd>
          </div>
        </dl>
        {office ? (
          <p className="mt-6">
            Ще изпратим поръчката до офис на Еконт:{" "}
            <span className="font-semibold">
              {office.label}, {office.street}
            </span>
            . {DISPATCH_NOTE}
          </p>
        ) : (
          <p className="mt-6">
            Ще се свържем с вас възможно най-скоро по телефона, за да уговорим
            доставката в гр. {LOCAL_DELIVERY_CITY}.
          </p>
        )}
        <p className="text-ink-soft mt-2">
          Ако имате въпроси, обадете се на{" "}
          <a
            href={OWNER_PHONE.href}
            className="text-brand-deep font-medium whitespace-nowrap underline underline-offset-4"
          >
            {OWNER_PHONE.display}
          </a>
          .
        </p>
        <Link
          href="/"
          className="bg-action text-action-ink hover:bg-action-hover mt-8 inline-flex min-h-14 items-center rounded-full px-8 text-lg font-semibold transition-colors"
        >
          Към продуктите
        </Link>
      </div>
    </div>
  );
}

function FilledCheckout({
  ready,
  items,
  products,
  offices,
  office,
  setOffice,
  answers,
  setAnswers,
  corrected,
  setCorrected,
  result,
  pending,
  formAction,
  onRemove,
}: {
  ready: boolean;
  items: CartItem[];
  products: CartProduct[];
  offices: EcontOffice[];
  office: EcontOffice | null;
  setOffice: Dispatch<SetStateAction<EcontOffice | null>>;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
  corrected: Corrected;
  setCorrected: Dispatch<SetStateAction<Corrected>>;
  result: PlaceOrderResult | null;
  pending: boolean;
  formAction: (formData: FormData) => void;
  onRemove: (slug: string) => void;
}) {
  const idempotencyKey = useRef<string | null>(null);
  const catalogue = new Map(products.map((product) => [product.slug, product]));
  const lines = items.map(({ slug, quantity }) => ({
    slug,
    quantity,
    product: catalogue.get(slug),
  }));
  const itemsCents = lines.reduce(
    (total, line) => total + (line.product?.priceCents ?? 0) * line.quantity,
    0,
  );
  const deliveryCents = deliveryPrice(
    answers.localDelivery ? "LOCAL" : "ECONT_OFFICE",
  );
  const everyPriceKnown = lines.every(
    (line) => (line.product?.priceCents ?? 0) > 0,
  );
  const blocked = blockedReason(lines);
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const totalText = !ready
    ? null
    : everyPriceKnown
      ? formatPrice(itemsCents + deliveryCents)
      : "TODO: цена";
  const [summaryOpen, setSummaryOpen] = useState(false);
  const linesId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
    if (!result || result.ok) return;

    const form = formRef.current;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>('[role="alert"]');

    target?.scrollIntoView({ block: "center" });
    if (target?.matches("input")) target.focus({ preventScroll: true });
  }, [result]);

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
  const linesShown = summaryOpen || unavailable.size > 0 || blocked !== null;
  const summary = summaryError(
    result,
    stillUnavailable,
    correctedFields.has("officeCode"),
  );

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

  function onLocalDeliveryChange(event: ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target;

    markCorrected("officeCode");
    setOffice(null);
    setAnswers((current) => ({ ...current, localDelivery: checked }));
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;

        const submitted = new FormData(event.currentTarget);
        idempotencyKey.current ??= crypto.randomUUID();
        submitted.set("idempotencyKey", idempotencyKey.current);

        startTransition(() => formAction(submitted));
      }}
      className="mt-6"
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="officeCode" value={office?.code ?? ""} />

      <fieldset
        disabled={!ready}
        className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
      >
        <section
          className={`${CARD} lg:sticky lg:top-4 lg:order-last lg:w-80 lg:shrink-0`}
        >
          <h2 className="text-lg font-semibold">
            <button
              type="button"
              aria-expanded={linesShown}
              aria-controls={linesId}
              onClick={() => setSummaryOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left lg:hidden"
            >
              <span>
                Вашата поръчка · {itemCount} бр.
                {totalText && ` · ${totalText}`}
              </span>
              <span
                aria-hidden="true"
                className={`text-ink-soft transition-transform ${linesShown ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            <span className="hidden lg:inline">Вашата поръчка</span>
          </h2>

          <div id={linesId} className={linesShown ? "" : "hidden lg:block"}>
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
                    {product?.stock === "NONE" && (
                      <p className="text-ink-soft mt-1 text-sm">Изчерпан</p>
                    )}
                    {(unavailable.has(slug) ||
                      !product ||
                      product.stock === "NONE") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSummaryOpen(true);
                          onRemove(slug);
                        }}
                        className="text-ink hover:text-brand-deep mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 sm:min-h-0"
                      >
                        Премахни
                        <span className="sr-only">
                          {" "}
                          {product?.name ?? slug}
                        </span>
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

            <p className="mt-4 flex items-center justify-between">
              <span>Доставка</span>
              <span className="font-semibold tabular-nums">
                {deliveryCents === 0 ? "Безплатна" : formatPrice(deliveryCents)}
              </span>
            </p>

            <p className="mt-4 hidden items-center justify-between text-lg font-semibold lg:flex">
              <span>Общо</span>
              <span className="text-brand-deep">{totalText}</span>
            </p>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 lg:flex-1">
          {summary && (
            <p
              role="alert"
              className="border-ink text-ink border-l-4 pl-4 font-medium"
            >
              {summary}
            </p>
          )}

          <StepCard step={1} title="Данни за връзка">
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
                  <p id="name-error" className={INPUT_ERROR_TEXT}>
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
                  <p id="email-error" className={INPUT_ERROR_TEXT}>
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
                  <p id="phone-error" className={INPUT_ERROR_TEXT}>
                    {FIELD_ERROR.phone}
                  </p>
                )}
              </div>
            </div>
          </StepCard>

          <StepCard step={2} title="Доставка">
            {!answers.localDelivery && (
              <p className="text-ink-soft mt-2 text-sm">{DISPATCH_NOTE}</p>
            )}
            <label className={`mt-4 ${CHECKBOX_LABEL}`}>
              <input
                type="checkbox"
                name="localDelivery"
                checked={answers.localDelivery}
                onChange={onLocalDeliveryChange}
                className={CHECKBOX}
              />
              <span>
                Поръчката е за гр. {LOCAL_DELIVERY_CITY} — доставяме лично и
                безплатно.
              </span>
            </label>

            {!answers.localDelivery && (
              <div className="mt-6">
                <OfficeCityPicker
                  offices={offices}
                  error={
                    invalid.has("officeCode")
                      ? {
                          id: "officeCode-error",
                          message: FIELD_ERROR.officeCode,
                        }
                      : null
                  }
                  onSelect={(chosen) => {
                    markCorrected("officeCode");
                    setOffice(chosen);
                  }}
                />
              </div>
            )}
          </StepCard>

          <StepCard step={3} title="Потвърждение">
            <div className="mt-4 flex flex-col gap-3">
              <div className={CONSENT_BOX}>
                <label className={CHECKBOX_LABEL}>
                  <input
                    type="checkbox"
                    name="acceptsTerms"
                    required
                    checked={answers.acceptsTerms}
                    onChange={onAnswerChange("acceptsTerms")}
                    className={CHECKBOX}
                    {...fieldProps("acceptsTerms")}
                  />
                  <span>
                    Прочетох и приемам{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      aria-describedby="new-tab-note"
                      className={LEGAL_LINK}
                    >
                      общите условия
                    </Link>
                    .
                  </span>
                </label>
                {invalid.has("acceptsTerms") && (
                  <p id="acceptsTerms-error" className={ERROR_TEXT}>
                    {FIELD_ERROR.acceptsTerms}
                  </p>
                )}
              </div>

              <p className="text-sm">
                Как обработваме данните ви:{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  aria-describedby="new-tab-note"
                  className={LEGAL_LINK}
                >
                  Политика за поверителност
                </Link>
                <span id="new-tab-note" className="sr-only">
                  Отваря се в нов раздел.
                </span>
              </p>

              <label className={`${CONSENT_BOX} ${CHECKBOX_LABEL}`}>
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

            <p className="mt-6 flex items-center justify-between text-lg font-semibold">
              <span>Общо</span>
              <span className="text-brand-deep">{totalText}</span>
            </p>

            <button
              type="submit"
              disabled={pending || blocked !== null}
              className="bg-action text-action-ink hover:bg-action-hover disabled:bg-placeholder disabled:text-ink-soft mt-4 min-h-14 w-full rounded-full px-6 py-3 text-base leading-snug font-semibold disabled:cursor-not-allowed sm:px-8 sm:text-lg"
            >
              {pending ? "Изпращане…" : "Поръчай с плащане при доставка"}
            </button>

            {blocked && <p className={ERROR_TEXT}>{blocked}</p>}
          </StepCard>

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
      </fieldset>
    </form>
  );
}

export function CheckoutForm({
  products,
  offices,
}: {
  products: CartProduct[];
  offices: EcontOffice[];
}) {
  const { cart, ready, remove, clear } = useCart();
  const [office, setOffice] = useState<EcontOffice | null>(null);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [corrected, setCorrected] = useState(NOTHING_CORRECTED);
  const [result, formAction, pending] = useActionState(submitOrder, null);
  const placed = result?.ok ? result.order : null;

  useEffect(() => {
    if (placed) clear();
  }, [placed, clear]);

  if (placed) {
    return (
      <OrderPlaced
        order={placed}
        office={answers.localDelivery ? null : office}
      />
    );
  }
  if (ready && cart.items.length === 0) return <EmptyCart />;

  return (
    <FilledCheckout
      ready={ready}
      items={cart.items}
      products={products}
      offices={offices}
      office={office}
      setOffice={setOffice}
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
