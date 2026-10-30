"use client";

import { type SubmitEvent, useRef, useState, useTransition } from "react";

import { saveProduct } from "@/app/admin/products/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import type { ProductEditResult } from "@/lib/admin-products";

type Refusal = Extract<ProductEditResult, { ok: false }>["code"];

type Failure = Refusal | "NOT_SAVED";

const FAILURE_TEXT: Record<Failure, string> = {
  INVALID_PRICE: "Въведете цена над нула, например 24,50.",
  INVALID_INPUT: "Промяната не беше приета. Презаредете страницата.",
  UNKNOWN_PRODUCT: "Продуктът вече не съществува. Презаредете страницата.",
  NOT_SAVED: "Не е запазено. Опитайте отново.",
};

type Status = "idle" | "saved" | Failure;

const MIN_SPIN_MS = 1500;

export function ProductEditForm({
  slug,
  name,
  price: initialPrice,
  stock: initialStock,
  stockOptions,
}: {
  slug: string;
  name: string;
  price: string;
  stock: string;
  stockOptions: { value: string; label: string }[];
}) {
  const [price, setPrice] = useState(initialPrice);
  const [stock, setStock] = useState(initialStock);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);

  const priceInvalid = status === "INVALID_PRICE";

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;

    const startedAt = Date.now();
    startTransition(async () => {
      try {
        const result = await saveProduct({ slug, price, stock });
        const remaining = MIN_SPIN_MS - (Date.now() - startedAt);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        setStatus(result.ok ? "saved" : result.code);
      } catch {
        setStatus("NOT_SAVED");
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={name}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="sm:w-40">
        <label htmlFor={`${slug}-price`} className={LABEL}>
          Цена (€)
        </label>
        <input
          id={`${slug}-price`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setStatus("idle");
          }}
          aria-invalid={priceInvalid || undefined}
          aria-describedby={priceInvalid ? `${slug}-status` : undefined}
          className={`${priceInvalid ? FIELD_INVALID : FIELD} tabular-nums`}
        />
      </div>
      <div className="sm:w-52">
        <label htmlFor={`${slug}-stock`} className={LABEL}>
          Наличност
        </label>
        <select
          id={`${slug}-stock`}
          value={stock}
          onChange={(event) => {
            setStock(event.target.value);
            setStatus("idle");
          }}
          className={FIELD}
        >
          {stockOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        aria-disabled={pending}
        className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-12 items-center justify-center rounded-md px-4 font-medium transition-colors sm:min-h-11 sm:min-w-24 sm:text-sm"
      >
        {pending ? (
          <>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5 motion-safe:animate-spin"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="sr-only">Записва се…</span>
          </>
        ) : (
          "Запази"
        )}
      </button>
      <p
        id={`${slug}-status`}
        role="status"
        className={`${status === "saved" ? "sr-only" : "text-error min-h-5 text-sm font-medium sm:self-center"}`}
      >
        {status === "idle"
          ? ""
          : status === "saved"
            ? "Запазено."
            : FAILURE_TEXT[status]}
      </p>
    </form>
  );
}
