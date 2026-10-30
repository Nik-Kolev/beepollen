"use client";

import { FONT_VARIABLES } from "@/app/fonts";
import { RetryButton } from "@/components/retry-button";

import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="bg" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="bg-ground text-ink flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center font-sans lining-nums">
        <h1 className="font-head text-2xl font-semibold">Възникна грешка</h1>
        <p className="text-ink-soft">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <RetryButton onClick={retry} />
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document request is what recovers a failed root layout; Link would re-render it client-side */}
          <a
            href="/"
            className="border-ink-soft hover:bg-surface inline-flex min-h-14 items-center justify-center rounded-full border-2 px-8 text-lg font-semibold transition-colors"
          >
            Към началната страница
          </a>
        </div>
      </body>
    </html>
  );
}
