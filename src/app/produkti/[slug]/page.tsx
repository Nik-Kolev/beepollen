import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { ProductGallery } from "@/components/product-gallery";
import { formatPrice } from "@/lib/money";
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
}: PageProps<"/produkti/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) return {};

  const [image] = product.images;
  const path = `/produkti/${product.slug}`;

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
}: PageProps<"/produkti/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) notFound();

  const foodInformation: [label: string, value: string | null][] = [
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

  // No `offers`: every seeded price is still zero, and a structured €0.00 is a
  // price search engines will publish.
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
        <Link
          href="/"
          className="text-ink-soft hover:text-brand-deep inline-flex items-center gap-2 text-sm transition-colors"
        >
          <span aria-hidden="true">&larr;</span>
          Към продуктите
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-14">
          <ProductGallery images={product.images} />

          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
              {product.name}
            </h1>

            {product.variety && (
              <p className="text-ink-soft mt-2 text-sm">{product.variety}</p>
            )}

            <p className="text-brand-deep mt-4 text-2xl font-semibold">
              {product.priceCents > 0
                ? formatPrice(product.priceCents)
                : "TODO: цена"}
            </p>

            <button
              type="button"
              disabled
              className="bg-action text-action-ink disabled:bg-placeholder disabled:text-ink-soft mt-6 w-full rounded-md px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed sm:w-auto sm:self-start"
            >
              Добави в количката
            </button>

            <p className="text-ink-soft mt-8 text-base whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>

        {foodInformation.some(([, value]) => value !== null) && (
          <section className="border-line mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold">Информация за продукта</h2>
            <dl className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {foodInformation
                .filter(([, value]) => value !== null)
                .map(([label, value]) => (
                  <div key={label} className="border-line border-b pb-3">
                    <dt className="text-ink-soft text-sm">{label}</dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}
      </div>
    </Container>
  );
}
