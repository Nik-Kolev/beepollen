import type { Metadata } from "next";

import { FONT_VARIABLES } from "@/app/fonts";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Пчелни продукти Д & Н Димитрови",
    template: "%s | Пчелни продукти Д & Н Димитрови",
  },
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="bg-ground text-ink flex min-h-full flex-col font-sans lining-nums">
        {children}
      </body>
    </html>
  );
}
