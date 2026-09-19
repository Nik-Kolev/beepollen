import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { OfficeCityPicker } from "@/components/delivery/office-city-picker";
import { listEcontOffices } from "@/lib/econt";

export const metadata: Metadata = {
  title: "Избор на офис на карта",
  description: "Избор на офис на Еконт от карта.",
  alternates: { canonical: "/delivery-test/map" },
  robots: { index: false, follow: false },
};

export default async function DeliveryMapTestPage() {
  const offices = await listEcontOffices();

  return (
    <Container>
      <div className="py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Избор на офис на карта
        </h1>
        <p className="mt-2 text-ink-soft">
          Изберете град, после офис.{" "}
          <Link href="/delivery-test" className="underline">
            Вариантът без карта
          </Link>
          .
        </p>

        <div className="mt-8">
          <OfficeCityPicker offices={offices} />
        </div>
      </div>
    </Container>
  );
}
