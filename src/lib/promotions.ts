export type PromotionTerms = { kind: "PERCENT" | "PRICE"; value: number };

const sofiaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Sofia",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function sofiaToday(now = new Date()) {
  return sofiaDay.format(now);
}

export function promoPriceCents(regularCents: number, terms: PromotionTerms) {
  const cents =
    terms.kind === "PRICE"
      ? terms.value
      : Math.round((regularCents * (100 - terms.value)) / 100);

  return Number.isInteger(cents) && cents > 0 && cents < regularCents
    ? cents
    : null;
}

export function activePromotionQuery(today: string) {
  return {
    where: { startsOn: { lte: today }, endsOn: { gte: today }, endedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { kind: true, value: true },
  };
}

export function withPromotion<
  T extends { priceCents: number; promotions: PromotionTerms[] },
>(product: T) {
  const { promotions, ...rest } = product;
  const promo = promotions[0];
  const cents = promo ? promoPriceCents(product.priceCents, promo) : null;

  return {
    ...rest,
    priceCents: cents ?? product.priceCents,
    regularPriceCents: cents === null ? null : product.priceCents,
  };
}
