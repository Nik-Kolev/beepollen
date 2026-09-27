import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";

import { SITE_URL } from "@/lib/site";

import "./globals.css";

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin", "cyrillic"],
});
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
});

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
    <html
      lang="bg"
      className={`${robotoSlab.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="bg-ground text-ink flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
