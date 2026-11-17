import type { Metadata } from "next";
import Image from "next/image";

import { Container } from "@/components/container";
import { TEXT_LINK } from "@/components/link-styles";
import {
  LEGAL_GUARANTEE_NOTICE,
  LEGAL_GUARANTEE_NOTICE_ALT,
  LEGAL_GUARANTEE_PATH,
  YOUR_EUROPE_GUARANTEES,
} from "@/lib/legal-guarantee";
import { CONTACT_EMAIL, OWNER_PHONE } from "@/lib/site";
import { CONFORMITY } from "@/lib/withdrawal-terms";

export const metadata: Metadata = {
  title: "Законова гаранция",
  description:
    "Законовата гаранция за съответствие на стоките и официалното известие на Европейския съюз за нея.",
  alternates: { canonical: LEGAL_GUARANTEE_PATH },
};

export default function LegalGuaranteePage() {
  return (
    <Container>
      <article className="mx-auto flex max-w-2xl flex-col gap-6 py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Законова гаранция
        </h1>
        <p>{CONFORMITY}</p>
        <p>
          Ако получите продукт, който не отговаря на описанието, се свържете с
          нас на{" "}
          <span className="whitespace-nowrap">{OWNER_PHONE.display}</span> или
          на{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={TEXT_LINK}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <figure className="flex flex-col gap-3">
          <Image
            src={LEGAL_GUARANTEE_NOTICE}
            alt={LEGAL_GUARANTEE_NOTICE_ALT}
            width={595}
            height={842}
            unoptimized
            loading="eager"
            fetchPriority="high"
            className="border-line h-auto w-full rounded-xl border"
          />
          <figcaption className="text-ink-soft flex flex-col gap-2 text-sm">
            <a href={LEGAL_GUARANTEE_NOTICE} className={TEXT_LINK}>
              Отворете известието в пълен размер
            </a>
            <span>
              Повече за правата ви:{" "}
              <a href={YOUR_EUROPE_GUARANTEES.href} className={TEXT_LINK}>
                {YOUR_EUROPE_GUARANTEES.display}
              </a>
            </span>
          </figcaption>
        </figure>
      </article>
    </Container>
  );
}
