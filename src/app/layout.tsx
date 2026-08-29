import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Пчелни продукти Д & Н Димитрови",
    template: "%s | Пчелни продукти Д & Н Димитрови",
  },
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" className={`${geistSans.variable} antialiased`}>
      <body className="bg-stone-50 font-sans text-stone-900">{children}</body>
    </html>
  );
}
