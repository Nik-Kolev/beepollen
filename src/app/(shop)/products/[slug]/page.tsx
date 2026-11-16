import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { notFoundMetadata } from "@/components/not-found-content";
import { AddToCart } from "@/components/add-to-cart";
import { BackToProductsLink } from "@/components/back-to-products-link";
import { Container } from "@/components/container";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPrice } from "@/components/product-price";
import { nutritionRows } from "@/lib/nutrition";
import {
  getPublishedProductBySlug,
  listPublishedProductSlugs,
} from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  const products = await listPublishedProductSlugs();

  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) return notFoundMetadata;

  const [image] = product.images;
  const path = `/products/${product.slug}`;

  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: path },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: path,
      images: image ? [{ url: image.path, alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) notFound();

  const information: [label: string, value: string | null][] = [
    ["Описание", product.description],
    [
      "Нетно количество",
      product.netWeightGrams === null ? null : `${product.netWeightGrams} г`,
    ],
    ["Състав", product.composition],
    ["Произход", product.origin],
    ["Условия на съхранение", product.storage],
    ["Срок на годност", product.bestBefore],
    ["Алергени", product.allergenInfo],
  ];
  const productInformation = information.filter(
    (row): row is [string, string] => row[1] !== null,
  );
  const nutrition = nutritionRows(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    image: product.images.map((image) => new URL(image.path, SITE_URL).href),
    ...(product.netWeightGrams !== null && {
      weight: {
        "@type": "QuantitativeValue",
        value: product.netWeightGrams,
        unitCode: "GRM",
      },
    }),
  };

  return (
    <Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="py-8 sm:py-12">
        <BackToProductsLink />

        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-[auto_1fr] md:gap-x-10 md:gap-y-0 lg:gap-x-12">
          <div className="md:col-start-2 md:row-start-1">
            <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
              {product.name}
            </h1>

            {product.variety && (
              <p className="text-ink-soft mt-2 text-sm">{product.variety}</p>
            )}
          </div>

          <div className="md:col-start-1 md:row-span-2 md:row-start-1">
            <ProductGallery slug={product.slug} images={product.images} />
          </div>

          <div className="flex flex-col md:col-start-2 md:row-start-2 md:pt-4">
            <ProductPrice
              priceCents={product.priceCents}
              regularPriceCents={product.regularPriceCents}
              size="page"
            />

            <AddToCart
              slug={product.slug}
              name={product.name}
              soldOut={product.stock === "NONE"}
            />

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Информация за продукта</h2>
              <dl className="border-line divide-line mt-3 divide-y border-y">
                {productInformation.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4"
                  >
                    <dt className="text-ink-soft text-sm">{label}</dt>
                    <dd className="text-sm whitespace-pre-line">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {nutrition && (
              <section className="mt-8">
                <h2 id="nutrition-heading" className="text-lg font-semibold">
                  Хранителна стойност
                </h2>
                <table
                  aria-labelledby="nutrition-heading"
                  className="border-line divide-line mt-3 w-full divide-y border-y text-sm"
                >
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="text-ink-soft py-2 text-left font-normal"
                      >
                        <span className="sr-only">Хранителна съставка</span>
                      </th>
                      <th
                        scope="col"
                        className="text-ink-soft py-2 text-right font-normal"
                      >
                        на 100 г
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {nutrition.map((row) => (
                      <tr key={row.key}>
                        <th
                          scope="row"
                          className={`py-2 text-left font-normal ${row.nested ? "text-ink-soft pl-4" : ""}`}
                        >
                          {row.label}
                        </th>
                        <td className="py-2 pl-4 text-right whitespace-nowrap tabular-nums">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
