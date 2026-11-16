export type Nutrition = {
  energyKj: number | null;
  energyKcal: number | null;
  fatMg: number | null;
  saturatesMg: number | null;
  carbohydrateMg: number | null;
  sugarsMg: number | null;
  proteinMg: number | null;
  saltMg: number | null;
};

type NutrientField = Exclude<keyof Nutrition, "energyKj" | "energyKcal">;

export const WEB_NUTRITION_PER_100G = {
  energyKj: 1563,
  energyKcal: 371,
  fatMg: 6100,
  saturatesMg: 2200,
  carbohydrateMg: 54000,
  sugarsMg: 41000,
  proteinMg: 19000,
  saltMg: 30,
} satisfies Record<keyof Nutrition, number>;

export type NutrientKey =
  "fat" | "saturates" | "carbohydrate" | "sugars" | "protein" | "salt";

const NUTRIENT_ROWS: {
  key: NutrientKey;
  field: NutrientField;
  label: string;
  nested: boolean;
}[] = [
  { key: "fat", field: "fatMg", label: "Мазнини", nested: false },
  {
    key: "saturates",
    field: "saturatesMg",
    label: "от които наситени мастни киселини",
    nested: true,
  },
  {
    key: "carbohydrate",
    field: "carbohydrateMg",
    label: "Въглехидрати",
    nested: false,
  },
  { key: "sugars", field: "sugarsMg", label: "от които захари", nested: true },
  { key: "protein", field: "proteinMg", label: "Белтъчини", nested: false },
  { key: "salt", field: "saltMg", label: "Сол", nested: false },
];

const grams = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 2 });

function round(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function formatNutrient(field: NutrientField, mg: number) {
  const g = mg / 1000;

  if (field === "saltMg") {
    if (g < 0.0125) return "0 г";
    return `${grams.format(round(g, g >= 1 ? 0.1 : 0.01))} г`;
  }
  if (field === "saturatesMg" && g <= 0.1) return "0 г";
  if (g <= 0.5 && field !== "saturatesMg") return "0 г";
  return `${grams.format(round(g, g >= 10 ? 1 : 0.1))} г`;
}

export function formatEnergy(kj: number, kcal: number) {
  return `${Math.round(kj)} kJ / ${Math.round(kcal)} kcal`;
}

export type NutritionRow = {
  key: "energy" | NutrientKey;
  label: string;
  value: string;
  nested: boolean;
};

export function nutritionRows(nutrition: Nutrition): NutritionRow[] | null {
  const { energyKj, energyKcal } = nutrition;
  if (energyKj === null || energyKcal === null) return null;

  const rows: NutritionRow[] = [
    {
      key: "energy",
      label: "Енергийна стойност",
      value: formatEnergy(energyKj, energyKcal),
      nested: false,
    },
  ];
  for (const { key, field, label, nested } of NUTRIENT_ROWS) {
    const mg = nutrition[field];
    if (mg === null) return null;
    rows.push({ key, label, value: formatNutrient(field, mg), nested });
  }
  return rows;
}
