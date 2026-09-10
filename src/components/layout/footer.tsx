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
  "bottom-16 right-72 w-9 rotate-12 lg:right-80",
  "bottom-36 right-80 w-8 scale-x-[-1] rotate-6 lg:right-88",
  "top-8 right-72 w-8 scale-x-[-1] -rotate-12 lg:right-80",
  "bottom-28 right-8 w-8 rotate-6 lg:right-16",
  "top-12 right-10 w-9 scale-x-[-1] rotate-12 lg:right-14",
  "top-9 left-8 w-8 scale-x-[-1] -rotate-6",
  "bottom-20 left-28 w-9 rotate-6",
];

const hivePosition =
  "pointer-events-none absolute right-6 bottom-4 hidden w-40 sm:block lg:right-28 lg:w-48";

const mobileBees = [
  "top-10 left-4 w-9 -rotate-12",
  "top-8 right-4 w-8 scale-x-[-1] rotate-6",
  "bottom-24 left-6 w-7 rotate-6",
];

export function Footer() {
  return (
    <footer className="bg-footer text-footer-ink border-line relative overflow-hidden border-t text-sm">
      <HiveBox className={`text-bee-dark ${hivePosition}`} />

      {desktopBees.map((position) => (
        <Bee
          key={position}
          className={`text-bee-dark pointer-events-none absolute hidden sm:block ${position}`}
        />
      ))}

      {mobileBees.map((position) => (
        <Bee
          key={position}
          className={`text-bee-dark pointer-events-none absolute sm:hidden ${position}`}
        />
      ))}

      <Container>
        <div className="relative grid gap-10 py-12 text-center sm:grid-cols-3 sm:gap-8 sm:pr-44 sm:text-left lg:gap-12 lg:pr-80">
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-xs font-semibold tracking-[0.12em] uppercase">
                {column.heading}
              </h2>
              <ul className="text-footer-ink-soft mt-4 space-y-2.5">
                {column.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="border-footer-ink-soft/20 text-footer-ink-soft relative border-t py-6 text-center text-xs tracking-wide sm:text-left">
          © {new Date().getFullYear()} Пчелни продукти Д &amp; Н Димитрови
        </p>
      </Container>
    </footer>
  );
}
