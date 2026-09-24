import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout-form";
import { Container } from "@/components/container";
import { listEcontOffices } from "@/lib/delivery-offices";
import { listPublishedProductsForCart } from "@/lib/products";

export const metadata: Metadata = {
  title: "Поръчка",
  description: "Данни за връзка и преглед на поръчката.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: true },
};

export default async function CheckoutPage() {
  const [products, offices] = await Promise.all([
    listPublishedProductsForCart(),
    listEcontOffices(),
  ]);

  return (
    <Container>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">Поръчка</h1>

        <CheckoutForm products={products} offices={offices} />
      </div>
    </Container>
  );
}
