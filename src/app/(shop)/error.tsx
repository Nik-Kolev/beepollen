"use client";

import Link from "next/link";

import { Container } from "@/components/container";
import { RetryButton } from "@/components/retry-button";
import { OWNER_PHONE } from "@/lib/site";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-20 text-center sm:py-24">
        <h1 className="font-head text-2xl font-semibold sm:text-3xl">
          Възникна грешка
        </h1>
        <p className="text-ink-soft max-w-prose">
          В момента не можем да приемем поръчката ви. Опитайте отново след
          малко. Ако проблемът продължи, обадете се на{" "}
          <a
            href={OWNER_PHONE.href}
            className="text-brand-deep font-medium whitespace-nowrap underline underline-offset-4"
          >
            {OWNER_PHONE.display}
          </a>{" "}
          и ще приемем поръчката по телефона.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <RetryButton onClick={retry} />
          <Link
            href="/"
            className="border-ink-soft hover:bg-surface inline-flex min-h-14 items-center justify-center rounded-full border-2 px-8 text-lg font-semibold transition-colors"
          >
            Към началната страница
          </Link>
        </div>
      </div>
    </Container>
  );
}
