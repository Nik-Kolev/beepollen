import { Alegreya, Roboto } from "next/font/google";

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "cyrillic"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
});

export const FONT_VARIABLES = `${alegreya.variable} ${roboto.variable}`;
