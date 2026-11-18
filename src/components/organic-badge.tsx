import Image from "next/image";

import { TEXT_LINK } from "@/components/link-styles";
import { ORGANIC } from "@/lib/organic";

export function OrganicBadge() {
  return (
    <section aria-labelledby="organic-heading" className="mt-8">
      <h2 id="organic-heading" className="text-lg font-semibold">
        Биологично производство
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <figure className="flex flex-col p-1.5 pb-0">
          <Image
            src={ORGANIC.logo}
            alt={ORGANIC.logoAlt}
            width={96}
            height={64}
            unoptimized
          />
          <figcaption className="mt-1.5 text-sm leading-snug">
            <span className="block">{ORGANIC.controlBodyCode}</span>
            <span className="block">{ORGANIC.farming}</span>
          </figcaption>
        </figure>
        <a href={ORGANIC.certificate.href} className={`${TEXT_LINK} text-sm`}>
          {ORGANIC.certificate.label}
        </a>
      </div>
    </section>
  );
}
