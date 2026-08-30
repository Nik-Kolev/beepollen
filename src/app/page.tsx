import { Bee } from "@/components/art/bee";
import { HiveBox } from "@/components/art/hive-box";
import { HoneycombMark } from "@/components/art/honeycomb-mark";
import { Container } from "@/components/container";

const palettes = [
  {
    name: "Current — warm throughout",
    note: "Every surface is in the amber family; only the green button breaks it.",
    header: "oklch(0.72 0.05 75)",
    ground: "oklch(0.976 0.008 85)",
    placeholder: "oklch(0.93 0.014 78)",
    ink: "oklch(0.27 0.015 60)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.47 0.095 150)",
    footer: "oklch(0.21 0.025 55)",
    footerInk: "oklch(0.96 0.012 85)",
  },
  {
    name: "Navy — deeper and more formal than teal",
    note: "Same cool contrast, but reads premium rather than coastal.",
    header: "oklch(0.87 0.035 250)",
    ground: "oklch(0.975 0.005 250)",
    placeholder: "oklch(0.93 0.012 250)",
    ink: "oklch(0.25 0.03 260)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.47 0.095 150)",
    footer: "oklch(0.25 0.06 255)",
    footerInk: "oklch(0.95 0.015 250)",
  },
  {
    name: "Deep forest — richer than sage",
    note: "Chrome is green, so the button goes rust to stay findable.",
    header: "oklch(0.88 0.03 155)",
    ground: "oklch(0.975 0.008 130)",
    placeholder: "oklch(0.93 0.012 140)",
    ink: "oklch(0.25 0.03 160)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.52 0.15 35)",
    footer: "oklch(0.25 0.055 158)",
    footerInk: "oklch(0.95 0.015 150)",
  },
  {
    name: "Plum — unexpected, still warm-adjacent",
    note: "Sits opposite amber without the coldness of blue.",
    header: "oklch(0.87 0.03 320)",
    ground: "oklch(0.975 0.006 320)",
    placeholder: "oklch(0.93 0.012 320)",
    ink: "oklch(0.26 0.03 320)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.47 0.095 150)",
    footer: "oklch(0.26 0.05 325)",
    footerInk: "oklch(0.95 0.015 320)",
  },
  {
    name: "Charcoal — neutral chrome",
    note: "Chrome carries no hue at all, so amber is the only colour on the page.",
    header: "oklch(0.87 0.006 80)",
    ground: "oklch(0.98 0.004 85)",
    placeholder: "oklch(0.93 0.005 80)",
    ink: "oklch(0.26 0.008 70)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.47 0.095 150)",
    footer: "oklch(0.24 0.008 70)",
    footerInk: "oklch(0.95 0.005 85)",
  },
  {
    name: "Sage — contrast without going cold",
    note: "Green-grey chrome contrasts the amber but keeps the food warmth.",
    header: "oklch(0.87 0.028 135)",
    ground: "oklch(0.972 0.01 115)",
    placeholder: "oklch(0.93 0.012 120)",
    ink: "oklch(0.26 0.02 140)",
    brand: "oklch(0.63 0.135 62)",
    action: "oklch(0.44 0.08 145)",
    footer: "oklch(0.26 0.04 135)",
    footerInk: "oklch(0.95 0.015 120)",
  },
];

const products = [
  {
    name: "Lorem ipsum dolor",
    price: "12,00 €",
    bee: "top-3 right-3 w-10 -rotate-12",
  },
  { name: "Consectetur adipiscing", price: "9,50 €", bee: null },
  {
    name: "Sed do eiusmod",
    price: "18,00 €",
    bee: "bottom-3 left-3 w-9 rotate-6",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Container>
          <div className="relative grid gap-10 py-12 sm:py-16 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
            <div className="relative h-16 sm:hidden">
              <Bee className="text-bee-dark absolute top-0 left-[16%] w-10 -rotate-12" />
              <Bee className="text-bee-dark absolute top-7 left-[44%] w-8 rotate-6" />
              <Bee className="text-bee-dark absolute top-1 right-[18%] w-9 rotate-12" />
            </div>

            <div className="relative mx-auto hidden sm:block sm:w-44 lg:mx-0 lg:w-56">
              <HiveBox className="w-full" />

              <Bee className="text-bee-dark absolute -top-5 -right-7 w-11 -rotate-12" />
              <Bee className="text-bee-dark absolute -top-2 left-4 w-7 scale-x-[-1] rotate-12" />
              <Bee className="text-bee-dark absolute top-[30%] -right-9 w-6 scale-x-[-1] -rotate-6" />
              <Bee className="text-bee-dark absolute top-14 -left-8 w-9 rotate-6" />
              <Bee className="text-bee-dark absolute -bottom-1 -left-5 w-8 -rotate-6" />
              <Bee className="text-bee-dark absolute -right-6 bottom-6 w-7 rotate-12" />
            </div>

            <div className="text-center lg:text-left">
              <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                Lorem ipsum dolor sit amet consectetur
              </h1>
              <p className="text-ink-soft mx-auto mt-4 max-w-prose text-base sm:text-lg lg:mx-0">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <a
                href="#"
                className="bg-action hover:bg-action-hover mt-7 inline-block rounded-md px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                Lorem ipsum dolor
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-line relative overflow-hidden border-y">
        <Container>
          <div className="relative grid gap-8 py-12 lg:grid-cols-2">
            {palettes.map((palette) => (
              <div key={palette.name}>
                <div className="ring-line overflow-hidden rounded-xl ring-1">
                  <div
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      backgroundColor: palette.header,
                      color: palette.ink,
                    }}
                  >
                    <span className="text-sm leading-tight font-semibold">
                      Пчелни продукти
                      <span className="block text-[10px] font-normal">
                        Д &amp; Н Димитрови
                      </span>
                    </span>
                    <span style={{ color: "oklch(0.27 0.02 60)" }}>
                      <Bee className="w-8 -rotate-12" />
                    </span>
                    <span className="ml-auto text-xs opacity-80">
                      Lorem · Dolor · Amet
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-4 px-4 py-5"
                    style={{ backgroundColor: palette.ground }}
                  >
                    <div className="w-28 shrink-0 overflow-hidden rounded-lg bg-white">
                      <div
                        className="aspect-square"
                        style={{ backgroundColor: palette.placeholder }}
                      />
                      <div className="flex items-center gap-2 px-2 py-2">
                        <span
                          className="shrink-0"
                          style={{ color: palette.brand }}
                        >
                          <HoneycombMark className="h-8 w-auto" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className="truncate text-[10px]"
                            style={{ color: palette.ink }}
                          >
                            Lorem ipsum
                          </p>
                          <p
                            className="text-[11px] font-semibold"
                            style={{ color: palette.brand }}
                          >
                            12,00 €
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: palette.ink }}
                      >
                        Lorem ipsum dolor sit amet
                      </p>
                      <span
                        className="mt-3 inline-block rounded-md px-4 py-2 text-xs font-semibold text-white"
                        style={{ backgroundColor: palette.action }}
                      >
                        Lorem ipsum
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-3 px-4 py-4 text-[11px]"
                    style={{
                      backgroundColor: palette.footer,
                      color: palette.footerInk,
                    }}
                  >
                    <span>© 2026 Пчелни продукти</span>
                    <span
                      className="ml-auto"
                      style={{ color: "oklch(0.27 0.02 60)" }}
                    >
                      <Bee outline className="w-8 rotate-6" />
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold tracking-wide uppercase">
                  {palette.name}
                </p>
                <p className="text-ink-soft mt-1 text-xs">{palette.note}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden">
        <Container>
          <div className="relative py-12 sm:py-16">
            <h2 className="text-2xl font-semibold sm:text-3xl">Lorem ipsum</h2>

            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.name}>
                  <article className="bg-surface ring-line overflow-hidden rounded-xl ring-1">
                    <div className="relative">
                      <div className="bg-placeholder aspect-square" />
                      {product.bee && (
                        <Bee
                          className={`text-bee-dark absolute ${product.bee}`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-4 px-4 py-5">
                      <HoneycombMark className="text-brand h-16 w-auto shrink-0" />
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-brand-deep mt-1 font-semibold">
                          {product.price}
                        </p>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
