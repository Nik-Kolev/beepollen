import type { Metadata } from "next";

import { AboutProducers } from "@/components/about-producers";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import { listPublishedProducts } from "@/lib/products";
import { OWNER_PHONE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SHOP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "Пчелни продукти Д & Н Димитрови",
  url: SITE_URL,
  telephone: OWNER_PHONE.href.replace("tel:", ""),
  address: {
    "@type": "PostalAddress",
    addressLocality: LOCAL_DELIVERY_CITY,
    addressCountry: "BG",
  },
};

export default async function Home() {
  const products = await listPublishedProducts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SHOP_JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <section>
        <Container>
          <div className="pt-10 pb-12 sm:pt-14 sm:pb-16">
            <h1 className="font-head mx-auto max-w-3xl text-center text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Пчелни продукти от семеен пчелин
            </h1>

            {products.length === 0 ? (
              <p className="text-ink-soft mt-8 text-center">
                Няма налични продукти.
              </p>
            ) : (
              <ul
                role="list"
                className="@container mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))] gap-8 sm:mt-10 sm:gap-10"
              >
                {products.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      index={index}
                      aboveFold={index === 0}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </section>
      <AboutProducers />
    </>
  );
}
