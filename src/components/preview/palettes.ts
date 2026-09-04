// Plain module on purpose: the root layout reads these at module scope, and a
// value exported from a "use client" file resolves to undefined there.
export const PALETTE_ATTRIBUTE = "palette";
export const PALETTE_STORAGE_KEY = "beepollen-palette";
export const DEFAULT_PALETTE = "oak";

// Grouped by family so the strip reads in order rather than as thirty
// unrelated chips.
export const palettes = [
  { id: "oak", label: "Мед и дъб" },
  { id: "cream", label: "Крем и графит" },
  { id: "sand", label: "Пясък и желязо" },
  { id: "mocha", label: "Мока" },
  { id: "linen", label: "Лен" },
  { id: "amber", label: "Кехлибар" },
  { id: "ochre", label: "Охра" },
  { id: "clay", label: "Теракота" },
  { id: "rust", label: "Ръжда" },
  { id: "brick", label: "Тухла" },
  { id: "peach", label: "Праскова" },
  { id: "wine", label: "Бордо" },
  { id: "blush", label: "Пепел от рози" },
  { id: "olive", label: "Маслина" },
  { id: "moss", label: "Мъх" },
  { id: "forest", label: "Борова гора" },
  { id: "sage", label: "Салвия" },
  { id: "mint", label: "Мента" },
  { id: "seafoam", label: "Морска пяна" },
  { id: "teal", label: "Дълбок тюркоаз" },
  { id: "slate", label: "Мъгла" },
  { id: "steel", label: "Стомана" },
  { id: "denim", label: "Деним" },
  { id: "navy", label: "Тъмносиньо" },
  { id: "indigo", label: "Индиго" },
  { id: "plum", label: "Слива" },
  { id: "lavender", label: "Лавандула" },
  { id: "charcoal", label: "Въглен" },
  { id: "ink", label: "Мастило" },
  { id: "airy", label: "Въздушна" },
  { id: "trust", label: "Доверие" },
  { id: "organic", label: "Био" },
  { id: "market", label: "Пазар" },
  { id: "sale", label: "Разпродажба" },
  { id: "mono", label: "Черно и бяло" },
  { id: "nordic", label: "Скандинавско" },
  { id: "sunset", label: "Залез" },
  { id: "earth", label: "Земя" },
  { id: "berry", label: "Горски плод" },
  { id: "gold", label: "Злато и черно" },
];

export const paletteIds = palettes.map((palette) => palette.id);
