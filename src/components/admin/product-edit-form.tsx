"use client";

import { type SubmitEvent, useRef, useState, useTransition } from "react";

import { saveProduct } from "@/app/admin/products/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import type { ProductEditResult } from "@/lib/admin-products";

type Refusal = Extract<ProductEditResult, { ok: false }>["code"];

const REFUSAL_TEXT: Record<Refusal, string> = {
  INVALID_PRICE: "Въведете цена над нула, например 24,50.",
  INVALID_INPUT: "Промяната не беше приета. Презаредете страницата.",
  UNKNOWN_PRODUCT: "Продуктът вече не съществува. Презаредете страницата.",
};

type Status = "idle" | "saved" | Refusal;

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

    startTransition(async () => {
      try {
        const result = await saveProduct({ slug, price, stock });
        setStatus(result.ok ? "saved" : result.code);
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
      className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
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
        className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover min-h-11 rounded-md px-4 text-sm font-medium transition-colors"
      >
        {pending ? "Записва се…" : "Запази"}
      </button>
      <p
        id={`${slug}-status`}
        aria-live="polite"
        className={`${status === "idle" || status === "saved" ? "text-ink" : "text-error"} min-h-5 text-sm font-medium sm:self-center`}
      >
        {status === "idle"
          ? ""
          : status === "saved"
            ? "Запазено."
            : REFUSAL_TEXT[status]}
      </p>
    </form>
  );
}
