export const REQUIRED_FOOD_INFORMATION = [
  "netWeightGrams",
  "composition",
  "origin",
  "storage",
  "allergenInfo",
] as const;

type RequiredField = (typeof REQUIRED_FOOD_INFORMATION)[number];

type FoodInformation = {
  netWeightGrams: number | null;
  composition: string | null;
  origin: string | null;
  storage: string | null;
  allergenInfo: string | null;
};

function filled(product: FoodInformation, field: RequiredField) {
  const value = product[field];

  if (field === "netWeightGrams") {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
  }
  return typeof value === "string" && value.trim() !== "";
}

export function missingFoodInformation(
  product: FoodInformation,
): RequiredField[] {
  return REQUIRED_FOOD_INFORMATION.filter((field) => !filled(product, field));
}

export function assertPublishable(
  product: FoodInformation & { slug: string; isPublished: boolean },
) {
  if (!product.isPublished) return;

  const missing = missingFoodInformation(product);
  if (missing.length > 0) {
    throw new Error(
      `${product.slug} is published without ${missing.join(", ")}.`,
    );
  }
}
