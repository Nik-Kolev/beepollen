import { randomUUID } from "node:crypto";

export function validCheckoutInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Иван Иванов",
    email: `buyer-${randomUUID()}@example.com`,
    phone: "0888123456",
    items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
    acceptsTerms: true,
    acceptsOffers: false,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}
