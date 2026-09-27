import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container>
      <div className="flex flex-col items-start gap-4 py-24">{children}</div>
    </Container>
  );
}
