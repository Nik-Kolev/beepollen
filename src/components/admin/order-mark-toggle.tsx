"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";

import { markOrder } from "@/app/admin/orders/actions";
import type { OrderMark } from "@/lib/admin-orders";

export function OrderMarkToggle({
  reference,
  mark,
  label,
  on,
}: {
  reference: string;
  mark: OrderMark;
  label: string;
  on: boolean;
}) {
  const [shown, setShown] = useOptimistic(on);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);

  function handleClick() {
    if (saving.current) return;
    saving.current = true;
    setFailed(false);

    const next = !shown;
    startTransition(async () => {
      setShown(next);
      try {
        const result = await markOrder({ reference, mark, on: next });
        if (!result.ok) setFailed(true);
      } catch {
        setFailed(true);
      } finally {
        saving.current = false;
      }
    });
  }

  const cancelled = mark === "cancelled";
  const pressedClass = cancelled
    ? "bg-error border-error text-action-ink"
    : "bg-leaf border-leaf text-action-ink";

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={shown}
        aria-disabled={pending}
        className={`${shown ? pressedClass : "bg-surface border-line text-ink hover:border-brand-deep"} relative inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors`}
      >
        <span aria-hidden="true" className={shown ? "" : "invisible"}>
          {cancelled ? "✕" : "✓"}
        </span>
        {label}
      </button>
      <span
        role="status"
        className="text-error w-0 min-w-full text-sm font-medium"
      >
        {failed ? "Не е запазено. Опитайте отново." : ""}
      </span>
    </div>
  );
}
