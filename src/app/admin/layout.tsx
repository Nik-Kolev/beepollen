import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex-1">
      <Container>
        <div className="flex flex-col items-start gap-4 pt-4 pb-12">
          {children}
        </div>
      </Container>
    </main>
  );
}
