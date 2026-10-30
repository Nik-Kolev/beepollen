"use client";

import { chooseCookies, useCookieConsent } from "@/hooks/use-cookie-consent";

const CHOICE =
  "border-ink text-ink bg-surface hover:bg-ground aria-pressed:bg-ink aria-pressed:text-surface min-h-11 rounded-full border-2 px-6 font-semibold";

const STATUS = {
  accepted: "Приели сте бисквитките на Google Analytics.",
  rejected: "Отказали сте бисквитките на Google Analytics.",
  none: "Още не сте избрали.",
};

export function CookieChoice() {
  const { choice, ready } = useCookieConsent();

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="font-semibold">
        {ready ? STATUS[choice ?? "none"] : ""}
      </p>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!ready}
          aria-pressed={choice === "accepted"}
          onClick={() => chooseCookies("accepted")}
          className={CHOICE}
        >
          Приемам
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-pressed={choice === "rejected"}
          onClick={() => chooseCookies("rejected")}
          className={CHOICE}
        >
          Отказвам
        </button>
      </div>
    </div>
  );
}
