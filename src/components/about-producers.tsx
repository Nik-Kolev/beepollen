import Image from "next/image";

import { Container } from "@/components/container";
import { PRODUCERS } from "@/lib/producers";

export function AboutProducers() {
  return (
    <section aria-labelledby="about-heading" className="pb-12 sm:pb-16">
      <Container>
        <h2
          id="about-heading"
          className="font-head text-center text-3xl font-semibold sm:text-4xl"
        >
          За нас
        </h2>
        <ul
          role="list"
          className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-2 sm:gap-10"
        >
          {PRODUCERS.map((producer) => (
            <li key={producer.id}>
              <article className="bg-surface ring-line flex h-full flex-col overflow-hidden rounded-xl shadow-sm ring-1">
                <div className="bg-placeholder relative aspect-square">
                  <Image
                    src={producer.photo.path}
                    alt={producer.photo.alt}
                    fill
                    sizes="(min-width: 1152px) 540px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-[50%_8%]"
                  />
                </div>
                <div className="flex flex-col gap-3 p-5 sm:p-6">
                  <h3 className="font-head text-xl font-semibold">
                    {producer.name}
                  </h3>
                  <p className="text-ink-soft">{producer.bio}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
