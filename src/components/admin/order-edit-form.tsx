"use client";

import { useRouter } from "next/navigation";
import {
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  editOrder,
  loadEditOptions,
  previewOrderEdit,
} from "@/app/admin/orders/actions";
import { ORDER_LIST_ID } from "@/components/admin/order-list-id";
import { OfficeCityPicker } from "@/components/delivery/office-city-picker";
import {
  FIELD,
  FIELD_INVALID,
  INPUT_ERROR_TEXT,
  LABEL,
} from "@/components/form-styles";
import { FIELD_ERROR, UNKNOWN_OFFICE } from "@/lib/checkout-messages";
import { DeliveryMethod, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import type { EcontOffice } from "@/lib/econt";
import {
  changeText,
  ORDER_CHANGE_LABEL,
  type OrderChange,
} from "@/lib/order-change";
import type { OrderEditResult } from "@/lib/order-edit";

type Original = {
  name: string;
  email: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  officeCode: string;
  items: { slug: string; name: string; quantity: number }[];
};

type Answers = {
  name: string;
  email: string;
  phone: string;
  local: boolean;
  officeCode: string;
  items: { key: number; slug: string; quantity: string }[];
};

type Options = {
  offices: EcontOffice[];
  products: { slug: string; name: string }[];
};

const FAILURE_TEXT = {
  stale: "Поръчката вече е променена от друг екран.",
  refused: "Тази поръчка вече не може да се редактира.",
  invalid: "Поправете отбелязаните полета.",
  unknownOffice: UNKNOWN_OFFICE,
  unavailable:
    "Избран продукт вече не се продава. Изберете друг или махнете реда.",
  unchanged: "Няма промени за запазване.",
  offices: "Офисите не се заредиха. Затворете и отворете редакцията отново.",
  error: "Не е запазено. Опитайте отново.",
} as const;

type Failure = keyof typeof FAILURE_TEXT;

const TEXT_FIELDS = ["name", "phone", "email"] as const;

type TextField = (typeof TEXT_FIELDS)[number];

const SECONDARY_BUTTON =
  "border-line text-ink bg-surface hover:bg-ground inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors";

const PRIMARY_BUTTON =
  "bg-action border-action text-action-ink hover:bg-action-hover inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold shadow-sm transition-colors aria-disabled:opacity-70";

function answersFrom(original: Original): Answers {
  return {
    name: original.name,
    email: original.email,
    phone: original.phone,
    local: original.deliveryMethod === DeliveryMethod.LOCAL,
    officeCode: original.officeCode,
    items: original.items.map((item, index) => ({
      key: index,
      slug: item.slug,
      quantity: String(item.quantity),
    })),
  };
}

export function OrderEditForm({
  reference,
  original,
  officeCity,
}: {
  reference: string;
  original: Original;
  officeCity: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [openedFrom, setOpenedFrom] = useState({ original, officeCity });
  const [answers, setAnswers] = useState(() => answersFrom(original));
  const [options, setOptions] = useState<Options | null>(null);
  const offices = options?.offices ?? null;
  const nextKey = useRef(1000);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<Failure | null>(null);
  const [changes, setChanges] = useState<OrderChange[] | null>(null);
  const [notify, setNotify] = useState(true);
  const [pending, startTransition] = useTransition();
  const [, startLoading] = useTransition();
  const saving = useRef(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const inputRefs = useRef<Partial<Record<TextField, HTMLInputElement>>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const focusAfterClose = useRef(false);
  const focusInvalid = useRef(false);
  const reloaded = useRef(false);
  const focusRow = useRef<number | null>(null);
  const router = useRouter();
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;

  useEffect(() => {
    if (editing) inputRefs.current.name?.focus();
    else if (focusAfterClose.current) {
      focusAfterClose.current = false;
      openRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    const first = TEXT_FIELDS.find((field) => invalid.has(field));
    if (first) return inputRefs.current[first]?.focus();
    const row = answers.items.find(
      (item) =>
        invalid.has(`product-${item.key}`) ||
        invalid.has(`quantity-${item.key}`),
    );
    if (row) {
      document
        .getElementById(
          invalid.has(`product-${row.key}`)
            ? `${id}-item-${row.key}`
            : `${id}-quantity-${row.key}`,
        )
        ?.focus();
    }
  }, [invalid, answers.items, id]);

  useEffect(() => {
    if (focusRow.current === null) return;
    const key = focusRow.current;
    focusRow.current = null;
    document.getElementById(`${id}-item-${key}`)?.focus();
  }, [answers.items, id]);

  useEffect(
    () => () => {
      if (reloaded.current && document.activeElement === document.body) {
        document.getElementById(ORDER_LIST_ID)?.focus();
      }
    },
    [],
  );

  useEffect(() => {
    if (!changes || dialogRef.current?.open) return;
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }, [changes]);

  function startEditing() {
    setOpenedFrom({ original, officeCity });
    setAnswers(answersFrom(original));
    setInvalid(new Set());
    setFailure(null);
    setEditing(true);
    if (options) return;
    startLoading(async () => {
      try {
        setOptions(await loadEditOptions());
      } catch {
        setFailure("offices");
      }
    });
  }

  function stopEditing() {
    focusAfterClose.current = true;
    setEditing(false);
  }

  function reload() {
    reloaded.current = true;
    setFailure(null);
    stopEditing();
    router.refresh();
  }

  function payload() {
    return {
      reference,
      original: openedFrom.original,
      name: answers.name,
      email: answers.email,
      phone: answers.phone,
      deliveryMethod: answers.local
        ? DeliveryMethod.LOCAL
        : DeliveryMethod.ECONT_OFFICE,
      officeCode: answers.local ? "" : answers.officeCode,
      items: answers.items.map((item) => ({
        slug: item.slug,
        quantity: Number(item.quantity),
      })),
    };
  }

  function refusal(result: Extract<OrderEditResult, { ok: false }>) {
    if (result.reason === "VALIDATION_ERROR") {
      setFailure(result.fields.includes("original") ? "stale" : "invalid");
      focusInvalid.current = true;
      setInvalid(
        new Set([
          ...result.fields,
          ...(result.fields.includes("items")
            ? answers.items.map((item) => `quantity-${item.key}`)
            : []),
        ]),
      );
    } else if (result.reason === "UNKNOWN_OFFICE") {
      setFailure("unknownOffice");
    } else if (result.reason === "UNAVAILABLE_ITEMS") {
      setFailure("unavailable");
      focusInvalid.current = true;
      setInvalid(
        new Set(
          answers.items
            .filter((item) => result.slugs.includes(item.slug))
            .map((item) => `product-${item.key}`),
        ),
      );
    } else {
      setFailure(result.reason);
    }
  }

  function save(work: () => Promise<void>) {
    if (saving.current) return;
    saving.current = true;
    setFailure(null);
    startTransition(async () => {
      try {
        await work();
      } catch {
        setFailure("error");
      } finally {
        saving.current = false;
      }
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const outOfRange = answers.items.filter((item) => {
      const quantity = Number(item.quantity);
      return !Number.isInteger(quantity) || quantity < 1 || quantity > 99;
    });
    if (outOfRange.length > 0) {
      setFailure("invalid");
      focusInvalid.current = true;
      setInvalid(new Set(outOfRange.map((item) => `quantity-${item.key}`)));
      return;
    }
    save(async () => {
      const result = await previewOrderEdit(payload());
      if (!result.ok) return refusal(result);
      setInvalid(new Set());
      if (result.changes.length === 0) return setFailure("unchanged");
      setNotify(true);
      setChanges(result.changes);
    });
  }

  function confirm() {
    dialogRef.current?.close();
    save(async () => {
      const result = await editOrder({ ...payload(), notify });
      if (!result.ok) return refusal(result);
      stopEditing();
    });
  }

  function onField(field: TextField) {
    return (event: { target: { value: string } }) => {
      setAnswers((current) => ({ ...current, [field]: event.target.value }));
      setInvalid((current) => {
        if (!current.has(field)) return current;
        const next = new Set(current);
        next.delete(field);
        return next;
      });
    };
  }

  function setItem(key: number, change: { slug?: string; quantity?: string }) {
    setAnswers((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.key === key ? { ...item, ...change } : item,
      ),
    }));
    const marks = [
      ...(change.quantity !== undefined ? [`quantity-${key}`] : []),
      ...(change.slug !== undefined ? [`product-${key}`] : []),
    ];
    setInvalid((current) => {
      if (!marks.some((mark) => current.has(mark))) return current;
      const next = new Set(current);
      for (const mark of marks) next.delete(mark);
      next.delete("items");
      return next;
    });
  }

  function removeItem(key: number) {
    const items = answers.items;
    if (items.length < 2) return;
    const index = items.findIndex((item) => item.key === key);
    focusRow.current = (items[index - 1] ?? items[index + 1]).key;
    setAnswers((current) => ({
      ...current,
      items: current.items.filter((item) => item.key !== key),
    }));
  }

  const unusedProducts =
    options?.products.filter(
      (product) => !answers.items.some((item) => item.slug === product.slug),
    ) ?? [];

  function addItem() {
    const product = unusedProducts[0];
    if (!product) return;
    nextKey.current += 1;
    const key = nextKey.current;
    focusRow.current = key;
    setAnswers((current) => ({
      ...current,
      items: [...current.items, { key, slug: product.slug, quantity: "1" }],
    }));
  }

  function productChoices(slug: string) {
    const catalogue = options?.products ?? [];
    const withdrawn = openedFrom.original.items.filter(
      (item) => !catalogue.some((product) => product.slug === item.slug),
    );
    return [...withdrawn, ...catalogue].filter(
      (product) =>
        product.slug === slug ||
        !answers.items.some((item) => item.slug === product.slug),
    );
  }

  function fieldProps(field: string) {
    return invalid.has(field)
      ? {
          "aria-invalid": true,
          "aria-describedby": `${id}-${field}-error`,
          className: FIELD_INVALID,
        }
      : { className: FIELD };
  }

  const status = (
    <span role="status" className="text-error text-sm font-medium">
      {failure ? FAILURE_TEXT[failure] : ""}
    </span>
  );

  const outdated = failure === "stale" || failure === "refused";

  if (!editing) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <button
          ref={openRef}
          type="button"
          onClick={startEditing}
          className={`${SECONDARY_BUTTON} self-start text-sm`}
        >
          Редакция
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={`Редакция на ${reference}`}
      className="border-line mt-3 flex flex-col gap-4 border-t pt-4"
    >
      {TEXT_FIELDS.map((field) => (
        <div key={field}>
          <label htmlFor={`${id}-${field}`} className={LABEL}>
            {ORDER_CHANGE_LABEL[field]}
          </label>
          <input
            ref={(input) => {
              if (input) inputRefs.current[field] = input;
            }}
            id={`${id}-${field}`}
            type={
              field === "email" ? "email" : field === "phone" ? "tel" : "text"
            }
            autoComplete="off"
            value={answers[field]}
            onChange={onField(field)}
            {...fieldProps(field)}
          />
          {invalid.has(field) && (
            <p id={`${id}-${field}-error`} className={INPUT_ERROR_TEXT}>
              {FIELD_ERROR[field]}
            </p>
          )}
        </div>
      ))}

      {options ? (
        <fieldset className="flex flex-col gap-3">
          <legend className={`${LABEL} mb-2`}>Продукти</legend>
          <ul role="list" className="flex flex-col gap-3">
            {answers.items.map((item, index) => (
              <li
                key={item.key}
                className="border-line flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
              >
                <div className="sm:flex-1">
                  <label htmlFor={`${id}-item-${item.key}`} className={LABEL}>
                    Продукт {index + 1}
                  </label>
                  <select
                    id={`${id}-item-${item.key}`}
                    value={item.slug}
                    onChange={(event) =>
                      setItem(item.key, { slug: event.target.value })
                    }
                    {...(invalid.has(`product-${item.key}`)
                      ? {
                          "aria-invalid": true,
                          "aria-describedby": `${id}-unavailable-error`,
                          className: FIELD_INVALID,
                        }
                      : { className: FIELD })}
                  >
                    {productChoices(item.slug).map((product) => (
                      <option key={product.slug} value={product.slug}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:w-28">
                  <label
                    htmlFor={`${id}-quantity-${item.key}`}
                    className={LABEL}
                  >
                    Брой
                    <span className="sr-only"> за продукт {index + 1}</span>
                  </label>
                  <input
                    id={`${id}-quantity-${item.key}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(event) =>
                      setItem(item.key, { quantity: event.target.value })
                    }
                    {...(invalid.has(`quantity-${item.key}`)
                      ? {
                          "aria-invalid": true,
                          "aria-describedby": `${id}-items-error`,
                          className: FIELD_INVALID,
                        }
                      : { className: FIELD })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-disabled={answers.items.length === 1}
                  aria-label={`Махни продукт ${index + 1}`}
                  className={`${SECONDARY_BUTTON} aria-disabled:border-ink-soft/40 aria-disabled:text-ink/40 aria-disabled:cursor-not-allowed`}
                >
                  Махни
                </button>
              </li>
            ))}
          </ul>
          {answers.items.some((item) =>
            invalid.has(`quantity-${item.key}`),
          ) && (
            <p id={`${id}-items-error`} className={INPUT_ERROR_TEXT}>
              Въведете брой от 1 до 99 за всеки продукт.
            </p>
          )}
          {answers.items.some((item) => invalid.has(`product-${item.key}`)) && (
            <p id={`${id}-unavailable-error`} className={INPUT_ERROR_TEXT}>
              {FAILURE_TEXT.unavailable}
            </p>
          )}
          {unusedProducts.length > 0 && (
            <button
              type="button"
              onClick={addItem}
              className={`${SECONDARY_BUTTON} self-start text-sm`}
            >
              Добави продукт
            </button>
          )}
        </fieldset>
      ) : null}

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={answers.local}
          onChange={(event) =>
            setAnswers((current) => ({
              ...current,
              local: event.target.checked,
              officeCode: event.target.checked
                ? ""
                : openedFrom.original.officeCode,
            }))
          }
          className="accent-action size-5 shrink-0"
        />
        Доставка на ръка в гр. {LOCAL_DELIVERY_CITY}
      </label>

      {!answers.local &&
        (offices ? (
          <OfficeCityPicker
            offices={offices}
            initialCity={answers.officeCode ? openedFrom.officeCity : null}
            initialOfficeCode={answers.officeCode || null}
            error={
              invalid.has("officeCode")
                ? {
                    id: `${id}-officeCode-error`,
                    message: FIELD_ERROR.officeCode,
                  }
                : null
            }
            onSelect={(office) =>
              setAnswers((current) => ({
                ...current,
                officeCode: office?.code ?? "",
              }))
            }
          />
        ) : (
          failure !== "offices" && (
            <p className="text-ink-soft text-sm">Зареждат се офисите…</p>
          )
        ))}

      {status}
      {outdated && (
        <button
          type="button"
          onClick={reload}
          className={`${PRIMARY_BUTTON} self-start`}
        >
          Обнови
        </button>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={stopEditing}
          className={SECONDARY_BUTTON}
        >
          Затвори
        </button>
        <button
          type="submit"
          aria-disabled={pending}
          className={PRIMARY_BUTTON}
        >
          {pending ? "Записва се…" : "Запази"}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClose={() => setChanges(null)}
        className="bg-surface text-ink backdrop:bg-ink/60 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Сигурни ли сте?
        </h2>
        <p id={textId} className="mt-2">
          Поръчка {reference} ще се промени:
        </p>
        <ul role="list" className="mt-2 flex flex-col gap-2 text-sm">
          {changes?.map((change, index) => (
            <li key={index}>
              <span className="font-semibold">
                {ORDER_CHANGE_LABEL[change.field]}
              </span>
              <span className="block wrap-anywhere">
                {changeText(change.from)} → {changeText(change.to)}
              </span>
            </li>
          ))}
        </ul>
        <label className="mt-4 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
            className="accent-action size-5 shrink-0"
          />
          Изпрати обновен имейл на купувача
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelRef}
            onClick={() => dialogRef.current?.close()}
            className={SECONDARY_BUTTON}
          >
            Отказ
          </button>
          <button type="button" onClick={confirm} className={PRIMARY_BUTTON}>
            Да, запази
          </button>
        </div>
      </dialog>
    </form>
  );
}
