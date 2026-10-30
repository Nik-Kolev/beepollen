import { FIELD_ERROR } from "@/lib/checkout-messages";
import type { WithdrawalResult } from "@/lib/withdrawal";

export const WITHDRAWAL_FIELD_ERROR = {
  reference: "Въведете номера на поръчката, например BP1810261.",
  name: FIELD_ERROR.name,
  email: FIELD_ERROR.email,
  phone: FIELD_ERROR.phone,
} satisfies Record<"reference" | "name" | "email" | "phone", string>;

export const NOT_FOUND =
  "Не намерихме поръчка с тези данни. Номерът, телефонът и имейлът трябва да са същите като в поръчката.";

export const WITHDRAWAL_REFUSED =
  "Отказът не може да бъде приет в момента. Опитайте по-късно или ни се обадете.";

export const INCOMPLETE_WITHDRAWAL =
  "Данните не са пълни. Презаредете страницата и опитайте отново.";

export function withdrawalSummaryError(result: WithdrawalResult | null) {
  if (!result || result.ok) return null;
  if (result.code === "NOT_FOUND") return NOT_FOUND;
  if (result.code === "REJECTED") return WITHDRAWAL_REFUSED;

  return result.fields.every((field) => field in WITHDRAWAL_FIELD_ERROR)
    ? null
    : INCOMPLETE_WITHDRAWAL;
}

const sofiaDateTime = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatWithdrawalTime(date: Date) {
  return sofiaDateTime.format(date);
}
