import { Container } from "@/components/container";

const PRODUCERS = [
  {
    id: "first",
    name: "TODO: име на първия пчелар",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse. Excepteur sint occaecat cupidatat non proident.",
  },
  {
    id: "second",
    name: "TODO: име на втория пчелар",
    bio: "Curabitur pretium tincidunt lacus, nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit. Nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula.",
  },
];

function Silhouette() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="text-ink-soft size-full opacity-30"
    >
      <circle cx="50" cy="38" r="18" fill="currentColor" />
      <path d="M14 100c0-22 16-36 36-36s36 14 36 36z" fill="currentColor" />
    </svg>
  );
}

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
                <div className="bg-placeholder aspect-square">
                  <Silhouette />
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
