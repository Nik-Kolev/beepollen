"use client";

import {
  type SubmitEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { sendSampleEmails } from "@/app/admin/todo/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import type { SampleResult } from "@/lib/email/samples";

const STATUS_TEXT: Record<SampleResult["status"], string> = {
  SENT: "изпратен",
  FAILED: "не тръгна",
  SKIPPED: "не е пратен — изпращането не е настроено",
};

type Outcome =
  | { kind: "idle" }
  | { kind: "done"; results: SampleResult[] }
  | { kind: "invalid" }
  | { kind: "failed" };

function summary(outcome: Outcome) {
  if (outcome.kind === "invalid") return "Въведете валиден имейл адрес.";
  if (outcome.kind === "failed")
    return "Примерите не бяха пратени. Опитайте отново.";
  if (outcome.kind === "idle") return "";
  const sent = outcome.results.filter((r) => r.status === "SENT").length;
  return `Изпратени ${sent} от ${outcome.results.length}.`;
}

export function SampleEmailForm({ initial }: { initial: string }) {
  const id = useId();
  const [to, setTo] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const sending = useRef(false);
  const current = useRef(initial);

  const invalid = outcome.kind === "invalid";
  const allSent =
    outcome.kind === "done" &&
    outcome.results.every((r) => r.status === "SENT");

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;

    const submitted = to;
    startTransition(async () => {
      let next: Outcome;
      try {
        const result = await sendSampleEmails({ to: submitted });
        next = result.ok
          ? { kind: "done", results: result.results }
          : { kind: "invalid" };
      } catch {
        next = { kind: "failed" };
      } finally {
        sending.current = false;
      }
      if (current.current === submitted) setOutcome(next);
    });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-6 flex max-w-2xl flex-col gap-2"
    >
      <label htmlFor={`${id}-to`} className={LABEL}>
        Изпрати всички имейли като примери до
      </label>
      <input
        id={`${id}-to`}
        type="email"
        autoComplete="email"
        value={to}
        onChange={(event) => {
          current.current = event.target.value;
          setTo(event.target.value);
          setOutcome({ kind: "idle" });
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-status`}
        className={invalid ? FIELD_INVALID : FIELD}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          aria-disabled={pending}
          className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-12 items-center justify-center rounded-md px-4 font-medium sm:min-h-11 sm:text-sm"
        >
          {pending ? "Изпращат се…" : "Изпрати примерите"}
        </button>
        <p
          id={`${id}-status`}
          role="status"
          className={`min-h-5 text-sm font-medium ${allSent ? "text-brand-deep" : "text-error"}`}
        >
          {summary(outcome)}
        </p>
      </div>
      {outcome.kind === "done" && (
        <ul role="list" aria-label="Резултат" className="mt-1 text-sm">
          {outcome.results.map((result) => (
            <li key={result.title}>
              {result.title}:{" "}
              <span
                className={
                  result.status === "SENT"
                    ? "text-ink-soft"
                    : "text-error font-medium"
                }
              >
                {STATUS_TEXT[result.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
