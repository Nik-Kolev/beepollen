"use client";

import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-stone-50 px-4 text-center text-stone-900">
        <h1 className="text-2xl font-semibold">Възникна грешка</h1>
        <p className="text-stone-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
          >
            Опитайте отново
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document request is what recovers a failed root layout; Link would re-render it client-side */}
          <a
            href="/"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm transition-colors hover:bg-stone-100"
          >
            Към началната страница
          </a>
        </div>
      </body>
    </html>
  );
}
