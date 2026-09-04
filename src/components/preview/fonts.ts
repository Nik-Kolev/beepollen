// Plain module on purpose: the root layout reads these at module scope, and a
// value exported from a "use client" file resolves to undefined there.
export const FONT_ATTRIBUTE = "font";
export const FONT_STORAGE_KEY = "beepollen-font";
export const DEFAULT_FONT = "geist";

// Every family here ships a `cyrillic` subset — checked against
// next/dist/compiled/@next/font/dist/google/font-data.json, because a family
// without one renders Bulgarian in a substituted system font with no warning.
// The widely-used ones lead, since those are the pairings most shops actually
// run and the easiest to judge at a glance.
export const fontPairings = [
  { id: "geist", label: "Geist", note: "по подразбиране" },
  { id: "roboto", label: "Roboto", note: "най-разпространен" },
  { id: "storefront", label: "Montserrat + Open Sans", note: "магазин" },
  { id: "friendly", label: "Nunito", note: "меко и закръглено" },
  { id: "retail", label: "Oswald + Roboto", note: "витрина" },
  { id: "geometric", label: "Rubik", note: "геометрично" },
  { id: "airy-type", label: "Raleway + Open Sans", note: "леко" },
  { id: "slab", label: "Roboto Slab + Roboto", note: "плътно" },
  { id: "cyrillic-native", label: "PT Sans", note: "кирилица по рождение" },
  { id: "warm", label: "Lora + Inter", note: "меко" },
  { id: "classic", label: "Merriweather + Inter", note: "класическо" },
  { id: "editorial", label: "Playfair Display + Source Sans", note: "издание" },
  { id: "modern", label: "Unbounded + Onest", note: "модерно" },
  { id: "minimal", label: "Golos Text", note: "минимално" },
  { id: "boutique", label: "Prata + Jost", note: "бутиково" },
  { id: "artisan", label: "Cormorant + Montserrat", note: "занаятчийско" },
];

export const fontIds = fontPairings.map((pairing) => pairing.id);
