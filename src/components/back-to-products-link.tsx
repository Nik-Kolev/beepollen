"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const PRODUCTS_PATH = "/";

type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
};

function cameFromProducts() {
  const { navigation } = window as Window & { navigation?: NavigationHistory };
  const current = navigation?.currentEntry;

  if (!navigation || !current) return false;

  const previous = navigation.entries()[current.index - 1];

  return (
    previous?.url != null && new URL(previous.url).pathname === PRODUCTS_PATH
  );
}

export function BackToProductsLink() {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // A fresh navigation to the grid starts at the top; going back lets the
    // browser restore the scroll position the visitor left it at.
    if (cameFromProducts()) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={PRODUCTS_PATH}
      onClick={handleClick}
      className="text-ink-soft hover:text-brand-deep inline-flex items-center gap-2 text-sm transition-colors"
    >
      <span aria-hidden="true">&larr;</span>
      Към продуктите
    </Link>
  );
}
