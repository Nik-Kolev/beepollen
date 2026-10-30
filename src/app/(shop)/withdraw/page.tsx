import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { TEXT_LINK } from "@/components/link-styles";
import { WithdrawalForm } from "@/components/withdrawal-form";

export const metadata: Metadata = {
  title: "Отказ от договора",
  description: "Заявете отказ от поръчка в срока от 14 дни.",
  alternates: { canonical: "/withdraw" },
  robots: { index: false, follow: true },
};

export default function WithdrawPage() {
  return (
    <Container>
      <div className="mx-auto max-w-2xl py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Отказ от договора
        </h1>
        <p className="mt-4">
          Можете да се откажете от поръчката без да посочвате причина в срок от
          14 дни от деня, в който получите стоката. Попълнете данните, с които
          сте поръчали. Повече има в{" "}
          <Link href="/terms#withdrawal" className={TEXT_LINK}>
            общите условия
          </Link>
          .
        </p>

        <WithdrawalForm />
      </div>
    </Container>
  );
}
