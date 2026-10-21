import type { Metadata } from "next";

import { CartContents } from "@/components/cart-contents";
import { Container } from "@/components/container";
import { listPublishedProductsForCart } from "@/lib/products";

export const metadata: Metadata = {
  title: "Количка",
  description: "Продуктите, които сте добавили в количката.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const products = await listPublishedProductsForCart();

  return (
    <Container>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">Количка</h1>

        <CartContents products={products} />
      </div>
    </Container>
  );
}
