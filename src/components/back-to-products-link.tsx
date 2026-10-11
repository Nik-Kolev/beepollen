"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { ArrowIcon } from "@/components/art/arrow-icon";

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

    if (cameFromProducts()) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={PRODUCTS_PATH}
      onClick={handleClick}
      className="text-ink hover:text-brand-deep inline-flex min-h-11 items-center gap-2 text-base font-medium transition-colors"
    >
      <ArrowIcon direction="left" className="size-5" />
      Към продуктите
    </Link>
  );
}
