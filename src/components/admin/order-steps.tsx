"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { advanceOrder } from "@/app/admin/orders/actions";
import { ORDER_LIST_ID } from "@/components/admin/order-list-id";
import type { OrderStatus, OrderStep } from "@/lib/admin-orders";

const NEGATIVE_STEPS: readonly OrderStep[] = ["cancel", "return"];

const FAILURE_TEXT = {
  stale: "Поръчката вече е променена от друг екран.",
  refused: "Тази стъпка вече не е възможна.",
  error: "Не е запазено. Опитайте отново.",
} as const;

function Spinner() {
  return (
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
  );
}

export type StepConfirmation = { text: string; confirm: string };

export function OrderSteps({
  reference,
  status,
  steps,
  labels,
  canUndo,
  confirmations,
}: {
  reference: string;
  status: OrderStatus;
  steps: OrderStep[];
  labels: Record<OrderStep, string>;
  canUndo: boolean;
  confirmations: Partial<Record<OrderStep, StepConfirmation>>;
}) {
  const [failure, setFailure] = useState<keyof typeof FAILURE_TEXT | null>(
    null,
  );
  const [running, setRunning] = useState<OrderStep | null>(null);
  const [confirming, setConfirming] = useState<OrderStep | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const advanced = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const router = useRouter();

  useEffect(() => {
    if (confirming && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [confirming]);

  function request(step: OrderStep) {
    if (confirmations[step]) setConfirming(step);
    else run(step);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  const confirmation = confirming ? confirmations[confirming] : undefined;

  useEffect(
    () => () => {
      if (advanced.current && document.activeElement === document.body) {
        document.getElementById(ORDER_LIST_ID)?.focus();
      }
    },
    [],
  );

  function run(step: OrderStep) {
    if (saving.current) return;
    saving.current = true;
    setFailure(null);
    setRunning(step);

    startTransition(async () => {
      try {
        const result = await advanceOrder({
          reference,
          step,
          expected: status,
        });
        if (result.ok) advanced.current = true;
        else setFailure(result.reason);
      } catch {
        setFailure("error");
      } finally {
        saving.current = false;
      }
    });
  }

  if (steps.length === 0 && !canUndo && !failure) return null;

  const outdated = failure === "stale" || failure === "refused";

  return (
    <div className="mt-3 flex flex-col gap-2">
      {outdated && (
        <button
          type="button"
          onClick={() => {
            setFailure(null);
            router.refresh();
          }}
          className="bg-action border-action text-action-ink hover:bg-action-hover inline-flex min-h-11 items-center self-start rounded-md border-2 px-4 text-sm font-semibold shadow-sm transition-colors"
        >
          Обнови
        </button>
      )}
      {!outdated && steps.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => request(step)}
              aria-disabled={pending}
              className={`${NEGATIVE_STEPS.includes(step) ? "border-ink text-ink bg-surface hover:bg-ground" : "bg-action border-action text-action-ink hover:bg-action-hover"} inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 px-3 font-semibold shadow-sm transition-colors aria-disabled:opacity-70 sm:min-h-11 sm:min-w-36 sm:text-sm`}
            >
              {pending && running === step ? (
                <>
                  <Spinner />
                  <span className="sr-only">Записва се…</span>
                </>
              ) : (
                labels[step]
              )}
            </button>
          ))}
        </div>
      )}
      {!outdated && canUndo && (
        <button
          type="button"
          onClick={() => request("undo")}
          aria-disabled={pending}
          className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center gap-2 self-start text-sm underline underline-offset-4 aria-disabled:opacity-70"
        >
          {pending && running === "undo" && <Spinner />}
          {labels.undo}
        </button>
      )}
      <span role="status" className="text-error text-sm font-medium">
        {failure ? FAILURE_TEXT[failure] : ""}
      </span>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClose={() => setConfirming(null)}
        className="bg-surface text-ink backdrop:bg-ink/60 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Сигурни ли сте?
        </h2>
        <p id={textId} className="mt-2">
          {confirmation?.text}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={closeDialog}
            className="border-line text-ink bg-surface hover:bg-ground inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors"
          >
            Отказ
          </button>
          <button
            type="button"
            onClick={() => {
              const step = confirming;
              closeDialog();
              if (step) run(step);
            }}
            className="bg-error border-error text-action-ink inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors hover:opacity-90"
          >
            {confirmation?.confirm}
          </button>
        </div>
      </dialog>
    </div>
  );
}
