const priceFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(cents: number) {
  return priceFormatter.format(cents / 100);
}

export function pricePerKiloCents(
  priceCents: number,
  netWeightGrams: number | null,
) {
  if (!netWeightGrams || netWeightGrams === 1000 || priceCents <= 0) {
    return null;
  }
  return Math.round((priceCents * 1000) / netWeightGrams);
}
