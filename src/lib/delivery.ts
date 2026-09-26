import { DeliveryMethod } from "@/generated/prisma/enums";
import { TODO_ECONT_TARIFF_CENTS } from "@/lib/econt";

export { DeliveryMethod };

export const LOCAL_DELIVERY_CITY = "Попово";

export function deliveryPrice(method: DeliveryMethod): number {
  return method === DeliveryMethod.LOCAL ? 0 : TODO_ECONT_TARIFF_CENTS;
}
