import type { Metadata } from "next";
import Link from "next/link";

import { Bee } from "@/components/art/bee";
import { Container } from "@/components/container";

export const notFoundMetadata: Metadata = {
  title: "Страницата не е намерена",
};

export function NotFoundContent() {
  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-20 text-center sm:py-24">
        <div className="flex items-end gap-8" aria-hidden="true">
          <Bee className="text-bee-dark w-8 -rotate-12" />
          <Bee className="text-bee-dark w-11 rotate-6" />
          <Bee className="text-bee-dark w-7 scale-x-[-1] -rotate-6" />
        </div>
        <h1 className="font-head text-2xl font-semibold sm:text-3xl">
          Страницата не е намерена
        </h1>
        <p className="text-ink-soft max-w-prose">
          В този кошер няма такава страница. Върнете се в началото — там ви
          чакат всички продукти.
        </p>
        <Link
          href="/"
          className="bg-action text-action-ink hover:bg-action-hover mt-2 inline-flex min-h-14 items-center rounded-full px-8 text-lg font-semibold transition-colors"
        >
          Към началната страница
        </Link>
      </div>
    </Container>
  );
}
