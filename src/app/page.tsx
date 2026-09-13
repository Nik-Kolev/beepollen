import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { listPublishedProducts } from "@/lib/products";

export default async function Home() {
  const products = await listPublishedProducts();

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

            {products.length === 0 ? (
              <p className="text-ink-soft mt-8">Няма налични продукти.</p>
            ) : (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard product={product} index={index} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
