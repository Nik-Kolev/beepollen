import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Страницата не е намерена",
};

export default function NotFound() {
  return (
    <Container>
      <div className="flex flex-col items-start gap-4 py-24">
        <h1 className="text-2xl font-semibold">Страницата не е намерена</h1>
        <p className="text-stone-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <Link
          href="/"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
        >
          Към началната страница
        </Link>
      </div>
    </Container>
  );
}
