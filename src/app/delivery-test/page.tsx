import type { Metadata } from "next";

import { Container } from "@/components/container";
import { OfficeCityPicker } from "@/components/delivery/office-city-picker";
import { listEcontOffices } from "@/lib/delivery-offices";

export const metadata: Metadata = {
  title: "Избор на офис",
  description: "Избор на офис на Еконт за доставка.",
  alternates: { canonical: "/delivery-test" },
  robots: { index: false, follow: false },
};

export default async function DeliveryTestPage() {
  const offices = await listEcontOffices();

  return (
    <Container>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Доставка до офис на куриер
        </h1>

        <div className="mt-6">
          <OfficeCityPicker offices={offices} />
        </div>
      </div>
    </Container>
  );
}
