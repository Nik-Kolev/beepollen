import { randomUUID } from "node:crypto";

import { SMALL_CITY, SMALL_CITY_OFFICE_A } from "./fixture-offices";

export const TEST_OFFICE_CODE = SMALL_CITY_OFFICE_A.code;

export const TEST_OFFICE_SNAPSHOT = {
  deliveryMethod: "ECONT_OFFICE",
  officeCarrier: "ECONT",
  officeCode: TEST_OFFICE_CODE,
  officeName: SMALL_CITY,
  officeCity: SMALL_CITY,
  officeStreet: SMALL_CITY_OFFICE_A.street,
} as const;

export function validCheckoutInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Иван Иванов",
    email: `buyer-${randomUUID()}@example.com`,
    phone: "0888123456",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    deliveryMethod: "ECONT_OFFICE",
    officeCode: TEST_OFFICE_CODE,
    acceptsTerms: true,
    acceptsOffers: false,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}
