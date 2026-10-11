import { Bee } from "@/components/art/bee";
import { HiveBox } from "@/components/art/hive-box";
import { Container } from "@/components/container";
import { CurrentYear } from "@/components/layout/current-year";
import { OWNER_PHONE } from "@/lib/site";

const footerColumns: {
  heading: string;
  lines: { text: string; href?: string }[];
}[] = [
  {
    heading: "Контакти",
    lines: [
      { text: "гр. Попово" },
      { text: OWNER_PHONE.display, href: OWNER_PHONE.href },
    ],
  },
  {
    heading: "Доставка и плащане",
    lines: [
      { text: "До офис на Еконт или Спиди в цялата страна" },
      { text: "Лично и безплатно за град Попово" },
      { text: "Плащане с наложен платеж" },
    ],
  },
];

const hiveBees = [
  "top-1 left-3 w-8 -rotate-12",
  "top-5 right-2 w-8 scale-x-[-1] rotate-6",
  "bottom-16 left-0 w-7 rotate-6",
  "right-0 bottom-6 w-7 scale-x-[-1] -rotate-6",
];

export function Footer() {
  return (
    <footer className="bg-footer text-footer-ink border-line border-t text-sm">
      <Container>
        <div className="grid justify-items-center gap-10 py-12 text-center md:grid-cols-[auto_auto_auto] md:items-start md:justify-between md:justify-items-start md:gap-8 md:text-left">
          {footerColumns.map((column) => (
            <div key={column.heading} className="md:pt-10">
              <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
                {column.heading}
              </h2>
              <ul role="list" className="mt-4 space-y-3 text-base">
                {column.lines.map((line) => (
                  <li
                    key={line.text}
                    className="md:flex md:items-center md:gap-2.5 xl:whitespace-nowrap"
                  >
                    <svg
                      viewBox="0 0 14 16"
                      aria-hidden="true"
                      className="text-brand-deep hidden size-3.5 shrink-0 md:block"
                    >
                      <path
                        d="M7 1 L13 4.5 L13 11.5 L7 15 L1 11.5 L1 4.5 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {line.href ? (
                      <a
                        href={line.href}
                        className="hover:text-brand-deep underline-offset-4 hover:underline"
                      >
                        {line.text}
                      </a>
                    ) : (
                      line.text
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

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

        <div className="border-footer-ink-soft/20 text-footer-ink-soft flex flex-col items-center gap-3 border-t py-6">
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
          <span className="font-sans text-xs tracking-wide">
            © <CurrentYear builtIn={new Date().getFullYear()} /> Всички права
            запазени
          </span>
        </div>
      </Container>
    </footer>
  );
}
