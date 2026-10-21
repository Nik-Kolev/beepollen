import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { CookieChoice } from "@/components/cookie-choice";
import { Section } from "@/components/legal-section";
import { TEXT_LINK } from "@/components/link-styles";
import { CART_STORAGE_KEY } from "@/lib/cart";
import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

export const metadata: Metadata = {
  title: "Политика за бисквитките",
  description:
    "Какви бисквитки и записи в браузъра ползва сайтът, за какво и как да промените избора си.",
  alternates: { canonical: "/cookies" },
};

type Entry = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  consent: string;
};

const ENTRIES: Entry[] = [
  {
    name: COOKIE_CONSENT_KEY,
    provider: "Този сайт, запис в паметта на браузъра (localStorage)",
    purpose: "Помни дали сте приели или отказали Google Analytics.",
    duration: "Докато не го изтриете от браузъра",
    consent: "Не изисква съгласие — без него не можем да запомним отказа ви.",
  },
  {
    name: CART_STORAGE_KEY,
    provider: "Този сайт, запис в паметта на браузъра (localStorage)",
    purpose:
      "Пази продуктите в количката ви. Не се изпраща никъде, докато не направите поръчка.",
    duration: "Докато не го изтриете от браузъра",
    consent: "Не изисква съгласие — без него количката не може да работи.",
  },
  {
    name: "_ga",
    provider: "Google Analytics",
    purpose: "Различава отделните посетители, за да броим посещенията.",
    duration: "2 години",
    consent: "Само ако натиснете „Приемам“.",
  },
  {
    name: "_ga_<номер>",
    provider: "Google Analytics",
    purpose: "Помни текущото посещение.",
    duration: "2 години",
    consent: "Само ако натиснете „Приемам“.",
  },
];

export default function CookiesPage() {
  return (
    <Container>
      <article className="mx-auto flex max-w-2xl flex-col gap-8 py-8 sm:py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Политика за бисквитките
          </h1>
          <p className="text-ink-soft text-sm">
            Последна промяна: TODO: дата на публикуване
          </p>
        </header>

        <Section id="choice" title="Вашият избор">
          <p>
            Можете да промените избора си по всяко време — тук или от връзката
            „Бисквитки“ в долната част на всяка страница.
          </p>
          <CookieChoice />
        </Section>

        <Section id="what" title="Какво са бисквитките">
          <p>
            Бисквитките са малки файлове, които сайтът записва в браузъра ви.
            Същото правило важи и за другите записи в браузъра, като
            localStorage. Без вашето съгласие записваме само това, без което
            сайтът не може да изпълни нещо, което сте поискали.
          </p>
        </Section>

        <Section id="list" title="Какво записваме">
          <ul role="list" className="flex flex-col gap-4">
            {ENTRIES.map((entry) => (
              <li
                key={entry.name}
                className="border-line bg-surface rounded-xl border p-4"
              >
                <p className="font-mono text-sm font-semibold break-all">
                  {entry.name}
                </p>
                <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="text-ink-soft">Кой го записва</dt>
                  <dd className="mb-2 sm:mb-0">{entry.provider}</dd>
                  <dt className="text-ink-soft">За какво</dt>
                  <dd className="mb-2 sm:mb-0">{entry.purpose}</dd>
                  <dt className="text-ink-soft">Колко време</dt>
                  <dd className="mb-2 sm:mb-0">{entry.duration}</dd>
                  <dt className="text-ink-soft">Съгласие</dt>
                  <dd>{entry.consent}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <p>
            Ако откажете, Google Analytics не се зарежда, а вече записаните от
            него бисквитки се изтриват. Магазинът работи еднакво и в двата
            случая.
          </p>
        </Section>

        <Section id="google" title="Google Analytics">
          <p>
            Ползваме Google Analytics, за да знаем колко хора разглеждат сайта и
            откъде идват. Google може да обработва тези данни в САЩ. Преносът е
            разрешен от решението на Европейската комисия от 10 юли 2023 г. за
            Рамката за защита на данните между ЕС и САЩ.
          </p>
        </Section>

        <Section id="other" title="Какво не записваме">
          <p>
            Не ползваме рекламни бисквитки. Картата с офисите на Еконт зарежда
            изображения от OpenStreetMap и не записва бисквитки.
          </p>
        </Section>

        <Section id="who" title="Кой отговаря за данните">
          <p>
            Кой сме, как да се свържете с нас и какви са правата ви пише в{" "}
            <Link href="/privacy" className={TEXT_LINK}>
              политиката за поверителност
            </Link>
            .
          </p>
        </Section>
      </article>
    </Container>
  );
}
