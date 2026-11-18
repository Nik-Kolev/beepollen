"use client";

import Link from "next/link";
import {
  type SubmitEvent,
  useEffect,
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
  const [flash, setFlash] = useState(false);
  const busy = useRef(false);
  const flashTimer = useRef<number | undefined>(undefined);
  const focusNext = useRef<"value" | "edit" | null>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    if (!confirmingEnd || dialogRef.current?.open) return;
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }, [confirmingEnd]);

  function reset() {
    setEditing(null);
    setKind("PERCENT");
    setValue("");
    setStartsOn(today);
    setEndsOn("");
  }

  function edit(promotion: PanelPromotion) {
    focusNext.current = "value";
    setEditing(promotion.id);
    setKind(promotion.kind);
    setValue(formatValueInput(promotion));
    setStartsOn(promotion.startsOn);
    setEndsOn(promotion.endsOn);
    setStatus("idle");
  }

  function run(
    action: () => Promise<{ ok: boolean; code?: Failure }>,
    saving: boolean,
  ) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          setStatus("saved");
          if (saving) {
            reset();
            setFlash(true);
            window.clearTimeout(flashTimer.current);
            flashTimer.current = window.setTimeout(() => {
              flashTimer.current = undefined;
              const active = document.activeElement;
              if (
                active === document.body ||
                formRef.current?.contains(active)
              ) {
                focusNext.current = "edit";
              }
              setFlash(false);
            }, 1200);
          } else {
            focusNext.current = "value";
          }
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
    if (flashTimer.current !== undefined) return;
    run(
      () =>
        savePromotionAction({
          ...(editing !== null && { id: editing }),
          slug,
          kind,
          value,
          startsOn,
          endsOn,
        }),
      true,
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

  const open = history.find(
    (entry): entry is Extract<PanelEntry, { type: "PROMOTION" }> =>
      entry.type === "PROMOTION" &&
      (entry.status === "ACTIVE" || entry.status === "UPCOMING"),
  );
  const past = history.filter((entry) => entry !== open);
  const showForm = !open || editing !== null || flash;

  useEffect(() => {
    const target = focusNext.current;
    if (target === "value" && valueRef.current) valueRef.current.focus();
    else if (target === "edit" && editRef.current) editRef.current.focus();
    else return;
    focusNext.current = null;
  }, [showForm, editing, open?.id]);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="border-line mt-4 flex flex-col gap-4 border-t pt-4"
    >
      <h3 id={`${id}-heading`} className="font-semibold">
        Промоция
      </h3>

      {open && !showForm && (
        <div className="bg-ground border-leaf flex flex-col gap-3 rounded-lg border-l-4 px-4 py-3 text-sm">
          <p className="text-leaf font-semibold">
            {STATUS_TEXT[open.status]} промоция
          </p>
          <PromotionFacts entry={open} regularCents={regularCents} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              ref={editRef}
              onClick={() => edit(open)}
              className="border-line text-ink bg-surface hover:bg-ground inline-flex min-h-11 items-center rounded-md border-2 px-4 font-semibold"
            >
              Редактирай
            </button>
            <button
              type="button"
              aria-disabled={pending}
              onClick={() => {
                if (!busy.current) setConfirmingEnd(true);
              }}
              className="border-error text-error bg-surface hover:bg-ground inline-flex min-h-11 items-center rounded-md border-2 px-4 font-semibold"
            >
              Прекрати
            </button>
          </div>
          <dialog
            ref={dialogRef}
            aria-labelledby={`${id}-end-title`}
            aria-describedby={`${id}-end-text`}
            onClose={() => setConfirmingEnd(false)}
            className="bg-surface text-ink backdrop:bg-ink/60 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-6 text-base shadow-xl"
          >
            <h2 id={`${id}-end-title`} className="text-lg font-semibold">
              Сигурни ли сте?
            </h2>
            <p id={`${id}-end-text`} className="mt-2">
              Промоцията на {name} от {formatDay(open.startsOn)} до{" "}
              {formatDay(open.endsOn)} спира веднага. Прекратена промоция не
              може да се пусне отново, но можете да добавите нова.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                ref={cancelRef}
                onClick={() => dialogRef.current?.close()}
                className="border-line text-ink bg-surface hover:bg-ground inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => {
                  dialogRef.current?.close();
                  run(() => endPromotionAction(open.id), false);
                }}
                className="bg-error border-error text-action-ink inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors hover:opacity-90"
              >
                Прекрати промоцията
              </button>
            </div>
          </dialog>
        </div>
      )}

      {showForm && (
        <form
          ref={formRef}
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
                ref={valueRef}
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
              aria-disabled={pending || flash}
              className={`${flash ? "bg-leaf hover:bg-leaf" : "bg-action hover:bg-action-hover aria-disabled:bg-action-hover"} text-action-ink inline-flex min-h-12 items-center justify-center rounded-md px-4 font-medium sm:min-h-11 sm:text-sm`}
            >
              {flash
                ? "Запазено ✓"
                : editing === null
                  ? "Добави промоция"
                  : "Запази промоцията"}
            </button>
            {editing !== null && (
              <button
                type="button"
                onClick={() => {
                  focusNext.current = "edit";
                  reset();
                  setStatus("idle");
                }}
                className="text-ink-soft hover:text-ink min-h-11 px-2 text-sm font-medium underline underline-offset-4"
              >
                Откажи редакцията
              </button>
            )}
          </div>
        </form>
      )}

      <p
        id={`${id}-status`}
        role="status"
        className={
          status === "saved" ? "sr-only" : "text-error text-sm font-medium"
        }
      >
        {status === "idle"
          ? ""
          : status === "saved"
            ? "Запазено."
            : FAILURE_TEXT[status]}
      </p>

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">История на цените</h4>
          <ul role="list" className="flex flex-col gap-2 text-sm">
            {past.map((entry) =>
              entry.type === "PRICE" ? (
                <li
                  key={`price-${entry.id}`}
                  className="bg-ground flex flex-col gap-1 rounded-lg px-4 py-3"
                >
                  <p className="font-semibold">Нова редовна цена</p>
                  <Facts
                    facts={[
                      ["Дата", formatDay(entry.on)],
                      ["Беше", formatPrice(entry.fromCents)],
                      ["Стана", formatPrice(entry.toCents)],
                      ["Смени я", entry.changedBy],
                    ]}
                  />
                </li>
              ) : (
                <li
                  key={`promotion-${entry.id}`}
                  className="bg-ground flex flex-col gap-1 rounded-lg px-4 py-3"
                >
                  <p className="font-semibold">
                    {STATUS_TEXT[entry.status]} промоция
                    {entry.endedOn && ` на ${formatDay(entry.endedOn)}`}
                  </p>
                  <PromotionFacts entry={entry} regularCents={regularCents} />
                </li>
              ),
            )}
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

function Facts({ facts }: { facts: [label: string, value: string][] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1">
      {facts.map(([label, value]) => (
        <div key={label} className="flex gap-1.5">
          <dt className="text-ink-soft">{label}</dt>
          <dd className="font-medium tabular-nums break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PromotionFacts({
  entry,
  regularCents,
}: {
  entry: PanelPromotion;
  regularCents: number;
}) {
  const open = entry.status === "ACTIVE" || entry.status === "UPCOMING";
  const cents =
    entry.kind === "PRICE"
      ? entry.value
      : open
        ? promoPriceCents(regularCents, entry)
        : null;
  const facts: [string, string][] = [
    ["От", formatDay(entry.startsOn)],
    ["До", formatDay(entry.endsOn)],
  ];
  if (entry.kind === "PERCENT") facts.push(["Отстъпка", `−${entry.value}%`]);
  if (cents !== null) facts.push(["Цена", formatPrice(cents)]);
  return <Facts facts={facts} />;
}
