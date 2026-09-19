import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { OfficePicker } from "@/components/delivery/office-picker";
import { listEcontOffices } from "@/lib/econt";

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
        <h1 className="text-2xl font-semibold sm:text-3xl">Избор на офис</h1>
        <p className="mt-2 text-ink-soft">
          Списък без карта.{" "}
          <Link href="/delivery-test/map" className="underline">
            Вариантът с карта
          </Link>
          .
        </p>

        <div className="mt-8">
          <OfficePicker offices={offices} />
        </div>
      </div>
    </Container>
  );
}
