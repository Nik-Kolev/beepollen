"use client";

import Link from "next/link";

import { Container } from "@/components/container";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <Container>
      <div className="flex flex-col items-start gap-4 py-24">
        <h1 className="text-2xl font-semibold">Възникна грешка</h1>
        <p className="text-stone-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
          >
            Опитайте отново
          </button>
          <Link
            href="/"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm transition-colors hover:bg-stone-100"
          >
            Към началната страница
          </Link>
        </div>
      </div>
    </Container>
  );
}
