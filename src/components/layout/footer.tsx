import { Container } from "@/components/container";

const footerColumns = [
  {
    heading: "Lorem ipsum",
    lines: ["Lorem dolor sit", "Amet consectetur", "Adipiscing elit sed"],
  },
  {
    heading: "Lorem tempor",
    lines: ["Lorem incididunt ut", "Labore et dolore", "Magna aliqua enim"],
  },
  {
    heading: "Lorem veniam",
    lines: ["Lorem nostrud exercitation", "Ullamco laboris nisi"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white text-sm">
      <Container>
        <div className="grid gap-8 py-10 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h2 className="font-semibold">{column.heading}</h2>
              <ul className="mt-3 space-y-2 text-stone-600">
                {column.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="border-t border-stone-200 py-6 text-xs text-stone-500">
          © {new Date().getFullYear()} Пчелни продукти Д &amp; Н Димитрови
        </p>
      </Container>
    </footer>
  );
}
