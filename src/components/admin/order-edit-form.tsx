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
  loadEditOffices,
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
};

type Answers = {
  name: string;
  email: string;
  phone: string;
  local: boolean;
  officeCode: string;
};

const FAILURE_TEXT = {
  stale: "Поръчката вече е променена от друг екран.",
  refused: "Тази поръчка вече не може да се редактира.",
  invalid: "Поправете отбелязаните полета.",
  unknownOffice: UNKNOWN_OFFICE,
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
  const [offices, setOffices] = useState<EcontOffice[] | null>(null);
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
    if (first) inputRefs.current[first]?.focus();
  }, [invalid]);

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
    if (offices) return;
    startLoading(async () => {
      try {
        setOffices(await loadEditOffices());
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
    };
  }

  function refusal(result: Extract<OrderEditResult, { ok: false }>) {
    if (result.reason === "VALIDATION_ERROR") {
      setFailure(result.fields.includes("original") ? "stale" : "invalid");
      focusInvalid.current = true;
      setInvalid(new Set(result.fields));
    } else if (result.reason === "UNKNOWN_OFFICE") {
      setFailure("unknownOffice");
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
        {status}
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
          {changes?.map((change) => (
            <li key={change.field}>
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
