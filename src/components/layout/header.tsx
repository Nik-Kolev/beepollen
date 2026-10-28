import Link from "next/link";

import { Bee } from "@/components/art/bee";
import { OwnerEmblem } from "@/components/art/owner-emblem";
import { Container } from "@/components/container";
import { CartLink } from "@/components/layout/cart-link";

export function Header() {
  return (
    <header className="bg-nav text-nav-ink sticky top-0 z-30 overflow-hidden shadow-[0_2px_8px_rgb(0_0_0/0.08)] [view-transition-name:site-header]">
      <Container>
        <div className="relative flex flex-wrap items-center gap-y-3 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-1 left-69 hidden w-9 -rotate-12 sm:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-7 left-85 hidden w-7 rotate-6 lg:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-5 left-[43%] hidden w-8 scale-x-[-1] rotate-6 lg:block"
          />
          <Bee
            outline
            className="text-bee-dark pointer-events-none absolute top-3 left-[66%] hidden w-8 -rotate-6 lg:block"
          />

          <div className="flex flex-1 justify-center pr-7 sm:flex-none sm:pr-0">
            <Link href="/" className="font-head flex items-center gap-2">
              <OwnerEmblem className="w-13 shrink-0" />
              <span>
                <span className="block text-xl leading-none font-bold">
                  Д{" "}
                  <span className="text-brand mr-0.5 text-2xl italic">
                    &amp;
                  </span>{" "}
                  Н Димитрови
                </span>
                <span className="text-ink-soft mt-1 -mr-[0.2em] block text-center font-sans text-xs font-medium tracking-[0.2em] uppercase">
                  пчелни продукти
                </span>
              </span>
            </Link>
          </div>

          <CartLink />
        </div>
      </Container>
    </header>
  );
}
