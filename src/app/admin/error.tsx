"use client";

export default function AdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <>
      <h1 className="text-2xl font-semibold">Възникна грешка</h1>
      <p className="text-ink-soft">
        Страницата не можа да се зареди.
        {digest && <> Код за проверка в лога: {digest}</>}
      </p>
      <button
        type="button"
        onClick={retry}
        className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
      >
        Опитайте отново
      </button>
    </>
  );
}
