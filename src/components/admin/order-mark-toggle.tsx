"use client";

import { useOptimistic, useRef, useTransition } from "react";

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
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);

  function handleClick() {
    if (saving.current) return;
    saving.current = true;

    const next = !shown;
    startTransition(async () => {
      setShown(next);
      try {
        await markOrder({ reference, mark, on: next });
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={shown}
      aria-disabled={pending}
      className={`${shown ? "bg-leaf border-leaf text-action-ink" : "bg-surface border-line text-ink hover:border-brand-deep"} relative inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors`}
    >
      <span aria-hidden="true" className={shown ? "" : "invisible"}>
        ✓
      </span>
      {label}
    </button>
  );
}
