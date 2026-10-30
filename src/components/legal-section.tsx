import type { ReactNode } from "react";

const SECTION = "flex flex-col gap-3";
const HEADING = "text-lg font-semibold";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={SECTION}>
      <h2 id={id} className={HEADING}>
        {title}
      </h2>
      {children}
    </section>
  );
}
