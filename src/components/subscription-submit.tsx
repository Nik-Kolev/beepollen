"use client";

import { useFormStatus } from "react-dom";

export function SubscriptionSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-action text-action-ink hover:bg-action-hover disabled:bg-placeholder disabled:text-ink-soft min-h-14 w-full rounded-full px-6 py-3 text-base leading-snug font-semibold disabled:cursor-wait sm:w-auto sm:px-8 sm:text-lg"
    >
      {pending ? "Изпращане…" : label}
    </button>
  );
}
