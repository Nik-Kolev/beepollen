import { formatPrice } from "@/lib/money";

const PRICE_TEXT = {
  card: "text-brand-deep font-head text-lg font-bold",
  page: "text-brand-deep text-2xl font-semibold",
  line: "text-brand-deep font-semibold",
  summary: "font-semibold",
} as const;

export function ProductPrice({
  priceCents,
  regularPriceCents,
  size,
  perUnit = false,
}: {
  priceCents: number;
  regularPriceCents: number | null;
  size: keyof typeof PRICE_TEXT;
  perUnit?: boolean;
}) {
  const priceText = PRICE_TEXT[size];
  const unit = perUnit ? " / бр." : "";

  if (priceCents <= 0) {
    return <p className={priceText}>{"TODO: цена"}</p>;
  }

  if (regularPriceCents === null) {
    return (
      <p className={`tabular-nums ${priceText}`}>
        {formatPrice(priceCents)}
        {unit}
      </p>
    );
  }

  const regular = (
    <s className="text-ink-soft text-sm font-normal">
      <span className="sr-only">Редовна цена </span>
      {formatPrice(regularPriceCents)}
    </s>
  );
  const promo = (
    <span className={priceText}>
      <span className="sr-only">Промоционална цена </span>
      {formatPrice(priceCents)}
      {unit}
    </span>
  );

  if (size === "summary") {
    return (
      <p className="flex flex-col items-end tabular-nums">
        {promo}
        {regular}
      </p>
    );
  }

  const percent = Math.round((1 - priceCents / regularPriceCents) * 100);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
      {promo}
      {regular}
      <span className="bg-honey text-ink inline-flex h-5 items-center rounded-full px-2 text-xs leading-none font-semibold">
        −{percent}%
      </span>
    </p>
  );
}
