"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

export function HideClosedToggle({
  checked,
  checkedHref,
  uncheckedHref,
}: {
  checked: boolean;
  checkedHref: string;
  uncheckedHref: string;
}) {
  const router = useRouter();
  const [shown, setShown] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();

  return (
    <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={shown}
        aria-busy={pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(() => {
            setShown(next);
            router.replace(next ? checkedHref : uncheckedHref, {
              scroll: false,
            });
          });
        }}
        className="accent-brand-deep size-5"
      />
      Скрий приключените — платени и отказани
    </label>
  );
}
