import { Bee } from "@/components/art/bee";
import { HoneycombMark } from "@/components/art/honeycomb-mark";
import { Container } from "@/components/container";

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
      <section>
        <Container>
          <div className="py-16 text-center sm:py-24">
            <h1 className="mx-auto max-w-3xl text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Lorem ipsum dolor sit amet consectetur
            </h1>
            <p className="text-ink-soft mx-auto mt-4 max-w-prose text-base sm:text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <a
              href="#"
              className="bg-action hover:bg-action-hover text-action-ink mt-7 inline-block rounded-md px-6 py-3 text-sm font-semibold transition-colors"
            >
              Lorem ipsum dolor
            </a>
          </div>
        </Container>
      </section>

      <section className="border-line border-t">
        <Container>
          <div className="py-12 sm:py-16">
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
