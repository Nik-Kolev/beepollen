import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Golos_Text,
  Inter,
  Jost,
  Lora,
  Merriweather,
  Montserrat,
  Nunito,
  Onest,
  Open_Sans,
  Oswald,
  PT_Sans,
  Playfair_Display,
  Prata,
  Raleway,
  Roboto,
  Roboto_Slab,
  Rubik,
  Source_Sans_3,
  Unbounded,
} from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  DEFAULT_FONT,
  FONT_ATTRIBUTE,
  FONT_STORAGE_KEY,
  fontIds,
} from "@/components/preview/fonts";
import {
  DEFAULT_PALETTE,
  PALETTE_ATTRIBUTE,
  PALETTE_STORAGE_KEY,
  paletteIds,
} from "@/components/preview/palettes";
import { PreviewSwitcher } from "@/components/preview/switcher";

import "./globals.css";

// Every family carries the cyrillic subset; a missing one substitutes a system
// font for the whole site without warning. The extra families are here only for
// the pairing preview and leave with it.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
});
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "cyrillic"],
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin", "cyrillic"] });
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});
const prata = Prata({
  variable: "--font-prata",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});
const jost = Jost({ variable: "--font-jost", subsets: ["latin", "cyrillic"] });
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
});
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "cyrillic"],
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
});
const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
});
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
});
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "cyrillic"],
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "cyrillic"],
});
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "cyrillic"],
});
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin", "cyrillic"],
});
const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin", "cyrillic"],
});
const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});

const fontVariables = [
  geist,
  playfair,
  sourceSans,
  lora,
  inter,
  prata,
  jost,
  unbounded,
  onest,
  merriweather,
  cormorant,
  montserrat,
  golos,
  roboto,
  openSans,
  nunito,
  oswald,
  rubik,
  raleway,
  robotoSlab,
  ptSans,
]
  .map((font) => font.variable)
  .join(" ");

// Runs before the first paint so a reload keeps the chosen palette and pairing
// instead of flashing the defaults. Each id is checked against the current list
// because one dropped since the visit is still sitting in that browser's
// storage. Goes with the switcher when the choices are made.
const restorePreview = `try{var s=[[${JSON.stringify(
  PALETTE_STORAGE_KEY,
)},${JSON.stringify(PALETTE_ATTRIBUTE)},${JSON.stringify(
  paletteIds,
)}],[${JSON.stringify(FONT_STORAGE_KEY)},${JSON.stringify(
  FONT_ATTRIBUTE,
)},${JSON.stringify(
  fontIds,
)}]];for(var i=0;i<s.length;i++){var v=localStorage.getItem(s[i][0]);if(s[i][2].indexOf(v)>-1)document.documentElement.dataset[s[i][1]]=v}}catch(e){}`;

export const metadata: Metadata = {
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
      data-palette={DEFAULT_PALETTE}
      data-font={DEFAULT_FONT}
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="bg-ground text-ink flex min-h-full flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: restorePreview }} />
        <Header />
        <PreviewSwitcher />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
