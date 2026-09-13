"use client";

import Link from "next/link";

import { Container } from "@/components/container";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <Container>
      <div className="flex flex-col items-start gap-4 py-24">
        <h1 className="text-2xl font-semibold">Възникна грешка</h1>
        <p className="text-ink-soft">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retry}
            className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
          >
            Опитайте отново
          </button>
          <Link
            href="/"
            className="border-line hover:bg-halo rounded-md border px-4 py-2 text-sm transition-colors"
          >
            Към началната страница
          </Link>
        </div>
      </div>
    </Container>
  );
}
