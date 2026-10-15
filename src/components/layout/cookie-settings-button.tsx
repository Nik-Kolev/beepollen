"use client";

import { reopenCookieBar } from "@/hooks/use-cookie-consent";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={(event) => reopenCookieBar(event.currentTarget)}
      className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline"
    >
      Бисквитки
    </button>
  );
}
