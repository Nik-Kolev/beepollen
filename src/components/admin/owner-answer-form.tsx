"use client";

import {
  type SubmitEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { saveAnswer } from "@/app/admin/todo/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import type { OwnerAnswerResult } from "@/lib/owner-answers";

type Failure = Extract<OwnerAnswerResult, { ok: false }>["code"] | "NOT_SAVED";

const FAILURE_TEXT: Record<Failure, string> = {
  TOO_LONG: "Текстът е твърде дълъг. Съкратете го.",
  INVALID_INPUT: "Отговорът не беше приет. Презаредете страницата.",
  NOT_SAVED: "Не е запазено. Опитайте отново.",
};

type Status = "idle" | "saved" | Failure;

const MIN_SPIN_MS = 1500;

export function OwnerAnswerForm({
  answerKey,
  label,
  initial,
}: {
  answerKey: string;
  label: string;
  initial: string;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const current = useRef(initial);

  const invalid = status === "TOO_LONG";

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;

    const submitted = text;
    const startedAt = Date.now();
    startTransition(async () => {
      try {
        const result = await saveAnswer({ key: answerKey, text: submitted });
        const remaining = MIN_SPIN_MS - (Date.now() - startedAt);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (current.current !== submitted) setStatus("idle");
        else setStatus(result.ok ? "saved" : result.code);
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
      className="mt-2 flex max-w-2xl flex-col gap-2"
    >
      <label htmlFor={`${id}-text`} className={LABEL}>
        {label}
      </label>
      <textarea
        id={`${id}-text`}
        rows={3}
        value={text}
        onChange={(event) => {
          current.current = event.target.value;
          setText(event.target.value);
          setStatus("idle");
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-status`}
        className={`${invalid ? FIELD_INVALID : FIELD} py-3`}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          aria-disabled={pending}
          className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-12 min-w-24 items-center justify-center rounded-md px-4 font-medium transition-colors sm:min-h-11 sm:text-sm"
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
          id={`${id}-status`}
          role="status"
          className={`min-h-5 text-sm font-medium ${status === "saved" ? "text-brand-deep" : "text-error"}`}
        >
          {status === "idle"
            ? ""
            : status === "saved"
              ? "Запазено."
              : FAILURE_TEXT[status]}
        </p>
      </div>
    </form>
  );
}
