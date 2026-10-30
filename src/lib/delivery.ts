import { DeliveryMethod } from "@/generated/prisma/enums";
import { TODO_ECONT_TARIFF_CENTS } from "@/lib/econt";

export { DeliveryMethod };

export const LOCAL_DELIVERY_CITY = "Попово";

export const DELIVERY_PERIOD =
  "Срокът за доставка обикновено е до 48 часа от поръчката и зависи от куриера и натовареността му.";

export const DISPATCH_NOTE = `${DELIVERY_PERIOD} Ако има промяна, ще се свържем с вас.`;

export function deliveryPrice(method: DeliveryMethod): number {
  return method === DeliveryMethod.LOCAL ? 0 : TODO_ECONT_TARIFF_CENTS;
}

export function inPlace(name: string) {
  return /^[вф]/i.test(name) ? `във ${name}` : `в ${name}`;
}
