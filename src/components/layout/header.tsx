import Link from "next/link";

import { Bee } from "@/components/art/bee";
import { Container } from "@/components/container";
import { CartLink } from "@/components/layout/cart-link";

const navPlaceholders = ["Lorem ipsum", "Lorem dolor", "Lorem amet"];

export function Header() {
  return (
    <header className="bg-nav text-nav-ink relative overflow-hidden">
      <Container>
        <div className="relative flex flex-wrap items-center gap-y-3 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-1 left-48 hidden w-9 -rotate-12 sm:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-7 left-72 hidden w-7 rotate-6 lg:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-5 left-[38%] hidden w-8 scale-x-[-1] rotate-6 lg:block"
          />

          <Link href="/" className="text-base leading-tight font-semibold">
            Пчелни продукти
            <span className="block text-xs font-normal">
              Д &amp; Н Димитрови
            </span>
          </Link>

          <ul className="order-last flex w-full justify-center gap-6 text-sm sm:order-none sm:ml-auto sm:w-auto">
            {navPlaceholders.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>

          <CartLink />
        </div>
      </Container>
    </header>
  );
}
