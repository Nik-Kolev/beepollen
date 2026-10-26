import { DeliveryMethod } from "@/generated/prisma/enums";
import { TODO_ECONT_TARIFF_CENTS } from "@/lib/econt";

export { DeliveryMethod };

export const LOCAL_DELIVERY_CITY = "Попово";

export const DISPATCH_NOTE =
  "Изпращаме в деня на поръчката или на следващия ден. Колко бързо ще пристигне, зависи от куриера. Ако има промяна, ще се свържем с вас.";

export function deliveryPrice(method: DeliveryMethod): number {
  return method === DeliveryMethod.LOCAL ? 0 : TODO_ECONT_TARIFF_CENTS;
}

export function inPlace(name: string) {
  return /^[вф]/i.test(name) ? `във ${name}` : `в ${name}`;
}
