"use client";

import Link from "next/link";
import {
  type SubmitEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  endPromotionAction,
  savePromotionAction,
} from "@/app/admin/products/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import type { PromotionRefusal, PromotionStatus } from "@/lib/admin-promotions";
import { formatPrice } from "@/lib/money";
import { promoPriceCents } from "@/lib/promotions";

export type PanelPromotion = {
  id: number;
  kind: "PERCENT" | "PRICE";
  value: number;
  startsOn: string;
  endsOn: string;
  status: PromotionStatus;
};

export type PanelEntry =
  | ({ type: "PROMOTION"; endedOn: string | null } & PanelPromotion)
  | {
      type: "PRICE";
      id: number;
      on: string;
      fromCents: number;
      toCents: number;
      changedBy: string;
    };

type Failure = PromotionRefusal | "NOT_SAVED";

const FAILURE_TEXT: Record<Failure, string> = {
  INVALID_INPUT: "Попълнете и двете дати.",
  INVALID_PERCENT: "Въведете процент между 1 и 99.",
  INVALID_PRICE: "Въведете цена над нула, например 6,50.",
  NOT_LOWER: "Промоционалната цена трябва да е по-ниска от редовната.",
  INVALID_DATES: "Крайната дата е преди началната.",
  ENDS_IN_PAST: "Крайната дата вече е минала.",
  STARTS_IN_PAST: "Началната дата вече е минала.",
  ALREADY_OPEN: "Продуктът вече има промоция. Редактирайте я или я прекратете.",
  UNKNOWN_PRODUCT: "Продуктът вече не съществува. Презаредете страницата.",
  UNKNOWN_PROMOTION:
    "Промоцията вече е приключила или прекратена. Презаредете страницата.",
  NOT_SAVED: "Не е запазено. Опитайте отново.",
};

const STATUS_TEXT: Record<PromotionStatus, string> = {
  UPCOMING: "Предстои",
  ACTIVE: "Активна",
  FINISHED: "Приключила",
  ENDED: "Прекратена",
};

export function formatDay(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

function formatValueInput(promotion: PanelPromotion) {
  return promotion.kind === "PERCENT"
    ? String(promotion.value)
    : (promotion.value / 100).toFixed(2).replace(".", ",");
}

export function PromotionPanel({
  slug,
  name,
  regularCents,
  today,
  history,
  moreHref,
}: {
  slug: string;
  name: string;
  regularCents: number;
  today: string;
  history: PanelEntry[];
  moreHref: string | null;
}) {
  const id = useId();
  const [editing, setEditing] = useState<number | null>(null);
  const [kind, setKind] = useState<"PERCENT" | "PRICE">("PERCENT");
  const [value, setValue] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | Failure>("idle");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  function reset() {
    setEditing(null);
    setKind("PERCENT");
    setValue("");
    setStartsOn(today);
    setEndsOn("");
  }

  function edit(promotion: PanelPromotion) {
    setEditing(promotion.id);
    setKind(promotion.kind);
    setValue(formatValueInput(promotion));
    setStartsOn(promotion.startsOn);
    setEndsOn(promotion.endsOn);
    setStatus("idle");
  }

  function run(
    action: () => Promise<{ ok: boolean; code?: Failure }>,
    clearForm = true,
  ) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (clearForm) reset();
          setStatus("saved");
        } else {
          setStatus(result.code ?? "NOT_SAVED");
        }
      } catch {
        setStatus("NOT_SAVED");
      } finally {
        busy.current = false;
      }
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() =>
      savePromotionAction({
        ...(editing !== null && { id: editing }),
        slug,
        kind,
        value,
        startsOn,
        endsOn,
      }),
    );
  }

  const valueInvalid =
    status === "INVALID_PERCENT" ||
    status === "INVALID_PRICE" ||
    status === "NOT_LOWER";
  const datesInvalid =
    status === "INVALID_INPUT" ||
    status === "INVALID_DATES" ||
    status === "ENDS_IN_PAST" ||
    status === "STARTS_IN_PAST";

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="border-line mt-4 flex flex-col gap-4 border-t pt-4"
    >
      <h3 id={`${id}-heading`} className="font-semibold">
        Промоция
      </h3>

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-label={`Промоция за ${name}`}
        className="flex flex-col gap-4"
      >
        <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
          <legend className={`${LABEL} mb-2`}>Намаление</legend>
          {(
            [
              ["PERCENT", "Процент"],
              ["PRICE", "Нова цена"],
            ] as const
          ).map(([option, label]) => (
            <label
              key={option}
              className="flex min-h-11 items-center gap-2 pl-4"
            >
              <input
                type="radio"
                name={`${id}-kind`}
                value={option}
                checked={kind === option}
                onChange={() => {
                  setKind(option);
                  setStatus("idle");
                }}
                className="size-5"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${id}-value`} className={LABEL}>
              {kind === "PERCENT" ? "Процент (%)" : "Нова цена (€)"}
            </label>
            <input
              id={`${id}-value`}
              type="text"
              inputMode={kind === "PERCENT" ? "numeric" : "decimal"}
              autoComplete="off"
              maxLength={20}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setStatus("idle");
              }}
              aria-invalid={valueInvalid || undefined}
              aria-describedby={valueInvalid ? `${id}-status` : undefined}
              className={`${valueInvalid ? FIELD_INVALID : FIELD} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-starts`} className={LABEL}>
              От
            </label>
            <input
              id={`${id}-starts`}
              type="date"
              value={startsOn}
              min={editing === null ? today : undefined}
              onChange={(event) => {
                setStartsOn(event.target.value);
                setStatus("idle");
              }}
              aria-invalid={datesInvalid || undefined}
              aria-describedby={datesInvalid ? `${id}-status` : undefined}
              className={datesInvalid ? FIELD_INVALID : FIELD}
            />
          </div>
          <div>
            <label htmlFor={`${id}-ends`} className={LABEL}>
              До (включително)
            </label>
            <input
              id={`${id}-ends`}
              type="date"
              value={endsOn}
              min={startsOn}
              onChange={(event) => {
                setEndsOn(event.target.value);
                setStatus("idle");
              }}
              aria-invalid={datesInvalid || undefined}
              aria-describedby={datesInvalid ? `${id}-status` : undefined}
              className={datesInvalid ? FIELD_INVALID : FIELD}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            aria-disabled={pending}
            className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-12 items-center justify-center rounded-md px-4 font-medium sm:min-h-11 sm:text-sm"
          >
            {editing === null ? "Добави промоция" : "Запази промоцията"}
          </button>
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                reset();
                setStatus("idle");
              }}
              className="text-ink-soft hover:text-ink min-h-11 px-2 text-sm font-medium underline underline-offset-4"
            >
              Откажи редакцията
            </button>
          )}
          <p
            id={`${id}-status`}
            role="status"
            className={
              status === "saved"
                ? "text-ink-soft text-sm"
                : "text-error text-sm font-medium"
            }
          >
            {status === "idle"
              ? ""
              : status === "saved"
                ? "Запазено."
                : FAILURE_TEXT[status]}
          </p>
        </div>
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">История на цените</h4>
          <ul role="list" className="flex flex-col gap-2 text-sm">
            {history.map((entry) => {
              if (entry.type === "PRICE") {
                return (
                  <li
                    key={`price-${entry.id}`}
                    className="bg-ground flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-4 py-2"
                  >
                    <span className="font-medium">Нова цена</span>
                    <span className="tabular-nums">{formatDay(entry.on)}</span>
                    <span className="tabular-nums">
                      {formatPrice(entry.fromCents)} →{" "}
                      {formatPrice(entry.toCents)}
                    </span>
                    <span className="text-ink-soft break-all">
                      {entry.changedBy}
                    </span>
                  </li>
                );
              }
              const cents = promoPriceCents(regularCents, entry);
              const open =
                entry.status === "ACTIVE" || entry.status === "UPCOMING";
              return (
                <li
                  key={`promotion-${entry.id}`}
                  className="bg-ground flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-4 py-2"
                >
                  <span className="font-medium">
                    {STATUS_TEXT[entry.status]}
                    {entry.endedOn && ` ${formatDay(entry.endedOn)}`}
                  </span>
                  <span className="tabular-nums">
                    {formatDay(entry.startsOn)} – {formatDay(entry.endsOn)}
                  </span>
                  <span className="tabular-nums">
                    {entry.kind === "PERCENT"
                      ? `−${entry.value}%`
                      : formatPrice(entry.value)}
                    {entry.kind === "PERCENT" &&
                      cents !== null &&
                      ` (${formatPrice(cents)})`}
                  </span>
                  {open && (
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => edit(entry)}
                        className="min-h-11 px-2 font-medium underline underline-offset-4"
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        aria-disabled={pending}
                        onClick={() =>
                          run(
                            () => endPromotionAction(entry.id),
                            editing === entry.id,
                          )
                        }
                        className="text-error min-h-11 px-2 font-medium underline underline-offset-4"
                      >
                        Прекрати
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {moreHref && (
            <Link
              href={moreHref}
              className="min-h-11 self-start py-2 text-sm font-medium underline underline-offset-4"
            >
              Покажи всички
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
