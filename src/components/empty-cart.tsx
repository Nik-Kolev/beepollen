import Link from "next/link";

export function EmptyCart() {
  return (
    <div className="py-10">
      <p className="text-ink-soft">Количката е празна.</p>
      <Link
        href="/"
        className="text-brand-deep mt-4 inline-block font-medium underline underline-offset-4"
      >
        Към продуктите
      </Link>
    </div>
  );
}
