"use client";

import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="bg-ground text-ink flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Възникна грешка</h1>
        <p className="text-ink-soft">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
          >
            Опитайте отново
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document request is what recovers a failed root layout; Link would re-render it client-side */}
          <a
            href="/"
            className="border-line hover:bg-halo rounded-md border px-4 py-2 text-sm transition-colors"
          >
            Към началната страница
          </a>
        </div>
      </body>
    </html>
  );
}
