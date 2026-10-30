import { Container } from "@/components/container";

export function ShowcaseBanner() {
  return (
    <aside aria-label="Състояние на сайта" className="bg-bee text-ink">
      <Container>
        <p className="py-2 text-center text-sm font-medium text-balance">
          Сайтът е в разработка — поръчки все още не се приемат.
        </p>
      </Container>
    </aside>
  );
}
