import Link from "next/link";

import { Bee } from "@/components/art/bee";
import { Container } from "@/components/container";
import { CartLink } from "@/components/layout/cart-link";

export function Header() {
  return (
    <header className="bg-nav text-nav-ink sticky top-0 z-30 overflow-hidden shadow-[0_2px_8px_rgb(0_0_0/0.08)] [view-transition-name:site-header]">
      <Container>
        <div className="relative flex flex-wrap items-center gap-y-3 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-11 left-48 w-6 -rotate-12 sm:hidden"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-5 right-23 hidden w-7 scale-x-[-1] min-[390px]:block sm:hidden"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-1 left-56 hidden w-9 -rotate-12 sm:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-7 left-72 hidden w-7 rotate-6 lg:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-5 left-[38%] hidden w-8 scale-x-[-1] rotate-6 lg:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-3 left-[66%] hidden w-8 -rotate-6 lg:block"
          />

          <Link href="/" className="font-head">
            <span className="block text-xl leading-none font-bold">
              Д <span className="text-brand mr-0.5 text-2xl italic">&amp;</span>{" "}
              Н Димитрови
            </span>
            <span className="text-ink-soft mt-1 -mr-[0.2em] block text-center font-sans text-xs font-medium tracking-[0.2em] uppercase">
              пчелни продукти
            </span>
          </Link>

          <CartLink />
        </div>
      </Container>
    </header>
  );
}
