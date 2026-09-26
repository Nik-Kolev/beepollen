import { randomUUID } from "node:crypto";

export const TEST_OFFICE_CODE = "1127";

export const TEST_OFFICE_SNAPSHOT = {
  officeCarrier: "ECONT",
  officeCode: TEST_OFFICE_CODE,
  officeName: "София",
  officeCity: "София",
  officeStreet: "ул. Тестова 1",
} as const;

export function validCheckoutInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Иван Иванов",
    email: `buyer-${randomUUID()}@example.com`,
    phone: "0888123456",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    officeCode: TEST_OFFICE_CODE,
    acceptsTerms: true,
    acceptsOffers: false,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}
