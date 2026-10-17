"use client";

import { useEffect, useRef } from "react";

import { Container } from "@/components/container";
import { chooseCookies, useCookieConsent } from "@/hooks/use-cookie-consent";

const CHOICE =
  "border-ink text-ink bg-surface hover:bg-ground min-h-11 rounded-full border-2 px-6 font-semibold transition-colors";

export function CookieBanner() {
  const { choice, ready, isReopened } = useCookieConsent();
  const firstButton = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  const shown = ready && (choice === null || isReopened);

  useEffect(() => {
    if (isReopened) firstButton.current?.focus();
  }, [isReopened]);

  useEffect(() => {
    const bar = section.current;
    if (!shown || !bar) return;

    const body = document.body;
    const reserve = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);

      body.style.paddingBottom = `${height}px`;
      body.style.minHeight = `calc(100% + ${height}px)`;
    };
    const observer = new ResizeObserver(reserve);

    reserve();
    observer.observe(bar);

    return () => {
      observer.disconnect();
      body.style.paddingBottom = "";
      body.style.minHeight = "";
    };
  }, [shown]);

  if (!shown) return null;

  return (
    <section
      ref={section}
      aria-label="Бисквитки"
      className="bg-surface border-line fixed inset-x-0 bottom-0 z-50 border-t shadow-[0_-4px_16px_rgb(0_0_0/0.08)] sm:pointer-events-none sm:border-t-0 sm:bg-transparent sm:pb-4 sm:shadow-none"
    >
      <Container>
        <div className="sm:bg-surface sm:border-line flex flex-col gap-3 py-4 sm:pointer-events-auto sm:rounded-xl sm:border sm:px-6 sm:shadow-lg md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="text-center text-sm md:text-left">
            Ползваме бисквитки на Google Analytics само ако ги приемете — за да
            знаем колко хора разглеждат сайта и откъде идват.
          </p>
          <div className="grid shrink-0 grid-cols-2 gap-3">
            <button
              ref={firstButton}
              type="button"
              onClick={() => chooseCookies("accepted")}
              className={CHOICE}
            >
              Приемам
            </button>
            <button
              type="button"
              onClick={() => chooseCookies("rejected")}
              className={CHOICE}
            >
              Отказвам
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
