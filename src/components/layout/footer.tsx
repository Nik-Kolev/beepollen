import Link from "next/link";

import { Bee } from "@/components/art/bee";
import { HiveBox } from "@/components/art/hive-box";
import { Container } from "@/components/container";
import { CurrentYear } from "@/components/layout/current-year";
import { OWNER_PHONE } from "@/lib/site";

const deliveryLines = [
  "До офис на Еконт или Спиди в цялата страна",
  "Лично и безплатно за град Попово",
  "Плащане с наложен платеж",
];

const COLUMN_HEADING =
  "text-sm font-semibold tracking-[0.12em] text-balance uppercase";

const hiveBees = [
  "top-1 left-3 w-8 -rotate-12",
  "top-5 right-2 w-8 scale-x-[-1] rotate-6",
  "bottom-16 left-0 w-7 rotate-6",
  "right-0 bottom-6 w-7 scale-x-[-1] -rotate-6",
];

export function Footer() {
  return (
    <footer className="bg-footer text-footer-ink font-head text-sm">
      <Container>
        <div className="grid justify-items-center gap-10 py-12 text-center md:grid-cols-[auto_auto_auto] md:items-start md:justify-between md:justify-items-start md:gap-8 md:py-8 md:text-left">
          <div className="md:pt-6 md:text-center">
            <h2 className={COLUMN_HEADING}>Желаете ли да се свържете с нас?</h2>
            <a
              href={OWNER_PHONE.href}
              className="bg-action text-action-ink hover:bg-action-hover mt-4 inline-flex min-h-12 items-center rounded-full px-6 text-lg font-semibold transition-colors"
            >
              {OWNER_PHONE.display}
            </a>
          </div>

          <div className="md:pt-6">
            <h2 className={COLUMN_HEADING}>Доставка и плащане</h2>
            <ul
              role="list"
              className="mt-4 space-y-3 text-base md:mt-3 md:space-y-2"
            >
              {deliveryLines.map((line) => (
                <li key={line} className="xl:whitespace-nowrap">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-hidden="true"
            className="relative h-44 w-56 shrink-0 lg:h-56 lg:w-72"
          >
            <HiveBox className="text-bee-dark absolute bottom-0 left-1/2 w-32 -translate-x-1/2 lg:w-44" />
            {hiveBees.map((position) => (
              <Bee
                key={position}
                className={`text-bee-dark absolute ${position}`}
              />
            ))}
          </div>
        </div>

        <div className="border-footer-ink-soft/20 text-footer-ink-soft flex flex-col items-center gap-3 border-t py-6 md:py-4">
          <span className="text-footer-ink inline-block">
            <span className="block text-base leading-none font-bold">
              Д{" "}
              <span className="text-brand-deep mr-0.5 text-lg italic">
                &amp;
              </span>{" "}
              Н Димитрови
            </span>
            <span className="text-footer-ink-soft mt-1 -mr-[0.2em] block text-center font-sans text-[10px] font-medium tracking-[0.2em] uppercase">
              пчелни продукти
            </span>
          </span>
          <span className="text-xs tracking-wide">
            © <CurrentYear builtIn={new Date().getFullYear()} /> Всички права
            запазени · гр. Попово
          </span>
          <nav aria-label="Правна информация">
            <ul role="list" className="flex flex-wrap justify-center gap-x-6">
              <li>
                <Link
                  href="/cookies"
                  className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline"
                >
                  Бисквитки
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
