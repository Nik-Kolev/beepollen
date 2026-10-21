"use client";

import Link from "next/link";
import { type Ref, useState } from "react";

import { Bee } from "@/components/art/bee";

const LINES = [
  "Във вашия кошер все още няма продукти.",
  "Пчеличките още не са донесли нищо в количката ви.",
  "Тук още е празно — изберете продукт.",
] as const;

export function EmptyCart({
  headingRef,
}: {
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const [line] = useState(() => Math.floor(Math.random() * LINES.length));

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex items-end gap-3" aria-hidden="true">
        <Bee className="text-bee-dark w-10 -rotate-12" />
        <Bee className="text-bee-dark w-14 rotate-6" />
        <Bee className="text-bee-dark w-9 scale-x-[-1] -rotate-6" />
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold focus:outline-none"
      >
        Количката е празна.
      </h2>
      <p className="text-ink-soft min-h-[2lh] max-w-prose sm:min-h-0">
        {LINES[line]}
      </p>
      <Link
        href="/"
        className="bg-action text-action-ink hover:bg-action-hover mt-2 inline-flex min-h-14 items-center rounded-full px-8 text-lg font-semibold transition-colors"
      >
        Към продуктите
      </Link>
    </div>
  );
}
