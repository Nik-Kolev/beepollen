import { Container } from "@/components/container";
import { OWNER_PHONE } from "@/lib/site";

export function ShowcaseBanner() {
  return (
    <aside aria-label="Състояние на сайта" className="bg-bee text-ink">
      <Container>
        <p className="py-2 text-center text-sm font-medium text-balance">
          Сайтът е в разработка — дотогава поръчвайте директно на телефон{" "}
          <a
            href={OWNER_PHONE.href}
            className="font-semibold whitespace-nowrap underline underline-offset-2"
          >
            {OWNER_PHONE.display}
          </a>
          .
        </p>
      </Container>
    </aside>
  );
}
