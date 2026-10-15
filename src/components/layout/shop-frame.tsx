import type { ReactNode } from "react";

import { AdminBar } from "@/components/layout/admin-bar";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export function ShopFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  );
}
