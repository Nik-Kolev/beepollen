"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";

import { submitWithdrawal } from "@/app/(shop)/withdraw/actions";
import {
  FIELD,
  FIELD_INVALID,
  INPUT_ERROR_TEXT,
  LABEL,
} from "@/components/form-styles";
import { OWNER_PHONE } from "@/lib/site";
import type { WithdrawalResult } from "@/lib/withdrawal";
import {
  formatWithdrawalTime,
  WITHDRAWAL_FIELD_ERROR,
  withdrawalSummaryError,
} from "@/lib/withdrawal-messages";

const CARD = "bg-surface ring-line rounded-xl p-5 shadow-sm ring-1 sm:p-6";

const FIELDS = [
  {
    name: "reference",
    label: "Номер на поръчката",
    type: "text",
    autoComplete: "off",
    hint: "Започва с BP и е в потвърждението на поръчката.",
  },
  { name: "name", label: "Име и фамилия", type: "text", autoComplete: "name" },
  { name: "phone", label: "Телефон", type: "tel", autoComplete: "tel" },
  {
    name: "email",
    label: "Имейл",
    type: "email",
    autoComplete: "email",
    hint: "Същият имейл, с който сте поръчали.",
  },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

type Answers = Record<FieldName, string>;

const EMPTY_ANSWERS: Answers = {
  reference: "",
  name: "",
  phone: "",
  email: "",
};

type Corrected = { of: WithdrawalResult | null; fields: Set<string> };

const NOTHING_CORRECTED: Corrected = { of: null, fields: new Set() };

function subscribeToNothing() {
  return () => {};
}

function WithdrawalReceived({
  reference,
  withdrawnAt,
  repeated,
  sent,
}: {
  reference: string;
  withdrawnAt: Date;
  repeated: boolean;
  sent: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`${CARD} mt-6 text-center`}>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">
        {repeated ? "Отказът вече е заявен" : "Отказът е получен"}
      </h2>
      <dl className="mt-6 flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <dt className="text-ink-soft">Поръчка:</dt>
          <dd className="font-semibold">{reference}</dd>
        </div>
        <div className="flex flex-wrap justify-center gap-x-2">
          <dt className="text-ink-soft">Отказ заявен на:</dt>
          <dd className="font-semibold tabular-nums">
            <time dateTime={withdrawnAt.toISOString()}>
              {formatWithdrawalTime(withdrawnAt)}
            </time>
          </dd>
        </div>
      </dl>
      <p className="mt-6">
        {sent
          ? "Ще се свържем с вас, за да уговорим връщането на стоката."
          : "Поръчката няма да бъде изпратена."}{" "}
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
  );
}

export function WithdrawalForm() {
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [corrected, setCorrected] = useState(NOTHING_CORRECTED);
  const [result, formAction, pending] = useActionState(submitWithdrawal, null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const ready = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    submitting.current = false;
    if (!result || result.ok) return;

    const form = formRef.current;
    const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const alert = form?.querySelector<HTMLElement>('[role="alert"]');

    (field ?? alert)?.scrollIntoView({ block: "center" });
    (field ?? form?.querySelector<HTMLElement>("#reference"))?.focus({
      preventScroll: true,
    });
  }, [result]);

  if (result?.ok) {
    return (
      <WithdrawalReceived
        reference={result.reference}
        withdrawnAt={result.withdrawnAt}
        repeated={result.repeated}
        sent={result.sent}
      />
    );
  }

  const correctedFields =
    corrected.of === result ? corrected.fields : new Set<string>();
  const reported =
    result && result.code === "VALIDATION_ERROR" ? result.fields : [];
  const invalid = new Set(
    reported.filter((field) => !correctedFields.has(field)),
  );
  const summary = withdrawalSummaryError(result);

  function onChange(field: FieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setCorrected((current) => ({
        of: result,
        fields:
          current.of === result
            ? new Set(current.fields).add(field)
            : new Set([field]),
      }));
      setAnswers((current) => ({ ...current, [field]: value }));
    };
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

        startTransition(() => formAction(submitted));
      }}
      className={`${CARD} mt-6`}
    >
      <fieldset disabled={!ready} className="flex min-w-0 flex-col gap-4">
        {summary && (
          <p
            role="alert"
            className="border-ink text-ink border-l-4 pl-4 font-medium"
          >
            {summary}
          </p>
        )}

        {FIELDS.map((field) => {
          const isInvalid = invalid.has(field.name);
          const hintId = "hint" in field ? `${field.name}-hint` : null;
          const errorId = isInvalid ? `${field.name}-error` : null;
          const describedBy = [hintId, errorId].filter(Boolean).join(" ");

          return (
            <div key={field.name}>
              <label htmlFor={field.name} className={LABEL}>
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                required
                value={answers[field.name]}
                onChange={onChange(field.name)}
                className={isInvalid ? FIELD_INVALID : FIELD}
                aria-invalid={isInvalid || undefined}
                aria-describedby={describedBy || undefined}
              />
              {"hint" in field && (
                <p
                  id={hintId ?? undefined}
                  className="text-ink-soft mt-2 pl-4 text-sm"
                >
                  {field.hint}
                </p>
              )}
              {isInvalid && (
                <p id={errorId ?? undefined} className={INPUT_ERROR_TEXT}>
                  {WITHDRAWAL_FIELD_ERROR[field.name]}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={pending}
          className="bg-action text-action-ink hover:bg-action-hover disabled:bg-placeholder disabled:text-ink-soft mt-2 min-h-14 w-full rounded-full px-6 py-3 text-base font-semibold disabled:cursor-not-allowed sm:text-lg"
        >
          {pending ? "Изпращане…" : "Потвърждавам отказа"}
        </button>

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
      </fieldset>
    </form>
  );
}
