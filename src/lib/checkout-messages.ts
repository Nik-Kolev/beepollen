import type { PlaceOrderResult } from "@/lib/orders";

export const FIELD_ERROR: Record<string, string> = {
  name: "Въведете име между 2 и 100 знака.",
  email: "Въведете валиден имейл адрес.",
  phone: "Въведете телефон между 6 и 30 знака.",
  acceptsTerms: "Трябва да приемете общите условия, за да продължите.",
  officeCode: "Изберете офис на Еконт, до който да получите поръчката.",
};

export const UNKNOWN_OFFICE =
  "Избраният офис вече не фигурира в списъка на Еконт. Изберете друг.";

export const INCOMPLETE_ORDER =
  "Данните на поръчката не са пълни. Презаредете страницата и опитайте отново.";

export const UNAVAILABLE_LINES =
  "Отбелязаните продукти вече не се предлагат. Премахнете ги, за да продължите.";

export const WITHDRAWN_LINES =
  "Премахнете продуктите, които вече не се предлагат, за да продължите.";

export const MISSING_PRICE =
  "Продукт в количката все още няма цена, затова поръчката не може да бъде завършена.";

// Deliberately says nothing about which check refused it.
export const REFUSED =
  "Поръчката не може да бъде приета в момента. Опитайте по-късно.";

// Here rather than in the form, which is a "use client" module a test cannot
// import — the same reason checkoutPayload left the action.
export function summaryError(
  result: PlaceOrderResult | null,
  stillUnavailable: boolean,
  officeCorrected: boolean,
) {
  if (!result || result.ok) return null;
  if (result.code === "REJECTED") return REFUSED;
  if (result.code === "UNKNOWN_OFFICE") {
    return officeCorrected ? null : UNKNOWN_OFFICE;
  }
  if (result.code === "UNAVAILABLE_ITEMS") {
    return stillUnavailable ? UNAVAILABLE_LINES : null;
  }

  // A field the form cannot mark would otherwise be refused in silence.
  return result.fields.every((field) => field in FIELD_ERROR)
    ? null
    : INCOMPLETE_ORDER;
}
