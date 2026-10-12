export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-action text-action-ink hover:bg-action-hover inline-flex min-h-14 items-center justify-center rounded-full px-8 text-lg font-semibold transition-colors"
    >
      Опитайте отново
    </button>
  );
}
