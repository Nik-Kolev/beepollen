import { Bee } from "@/components/art/bee";
import { HiveBox } from "@/components/art/hive-box";
import { Container } from "@/components/container";

const footerColumns = [
  {
    heading: "Lorem ipsum",
    lines: ["Lorem dolor sit", "Amet consectetur", "Adipiscing elit sed"],
  },
  {
    heading: "Lorem tempor",
    lines: ["Lorem incididunt ut", "Labore et dolore", "Magna aliqua enim"],
  },
  {
    heading: "Lorem veniam",
    lines: ["Lorem nostrud exercitation", "Ullamco laboris nisi"],
  },
];

const desktopBees = [
  "top-8 right-44 w-10 rotate-6 lg:right-56",
  "right-36 bottom-24 w-8 scale-x-[-1] -rotate-6 lg:right-48",
  "top-5 right-16 w-7 -rotate-12 lg:right-24",
  "top-14 right-24 w-6 scale-x-[-1] rotate-12 lg:right-36",
  "bottom-10 right-56 w-9 rotate-6 lg:right-72",
];

const mobileBees = [
  "top-10 left-4 w-9 -rotate-12",
  "top-8 right-4 w-8 scale-x-[-1] rotate-6",
  "bottom-24 left-6 w-7 rotate-6",
];

export function Footer() {
  return (
    <footer className="bg-chrome-deep text-chrome-ink relative overflow-hidden text-sm">
      <HiveBox className="pointer-events-none absolute right-4 bottom-6 hidden w-28 sm:block lg:right-10 lg:w-32" />

      {desktopBees.map((position) => (
        <Bee
          key={position}
          outline
          className={`text-bee-dark pointer-events-none absolute hidden sm:block ${position}`}
        />
      ))}

      {mobileBees.map((position) => (
        <Bee
          key={position}
          outline
          className={`text-bee-dark pointer-events-none absolute sm:hidden ${position}`}
        />
      ))}

      <Container>
        <div className="relative grid gap-8 py-12 text-center sm:grid-cols-3 sm:text-left">
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-xs font-semibold tracking-[0.12em] uppercase">
                {column.heading}
              </h2>
              <ul className="text-chrome-ink-soft mt-4 space-y-2.5">
                {column.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="border-chrome-ink-soft/20 text-chrome-ink-soft relative border-t py-6 text-center text-xs tracking-wide sm:text-left">
          © {new Date().getFullYear()} Пчелни продукти Д &amp; Н Димитрови
        </p>
      </Container>
    </footer>
  );
}
