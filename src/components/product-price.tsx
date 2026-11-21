import { formatPrice, pricePerKiloCents } from "@/lib/money";
import { discountPercent } from "@/lib/promotions";

const PRICE_TEXT = {
  card: "text-brand-deep font-head text-lg font-bold",
  page: "text-brand-deep text-2xl font-semibold",
  line: "text-brand-deep font-semibold",
  summary: "font-semibold",
} as const;

function shortDay(day: string) {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

export function ProductPrice({
  priceCents,
  regularPriceCents,
  size,
  perUnit = false,
  netWeightGrams = null,
  promotionEndsOn = null,
}: {
  priceCents: number;
  regularPriceCents: number | null;
  size: keyof typeof PRICE_TEXT;
  perUnit?: boolean;
  netWeightGrams?: number | null;
  promotionEndsOn?: string | null;
}) {
  const priceText = PRICE_TEXT[size];
  const unit = perUnit ? " / бр." : "";

  if (priceCents <= 0) {
    return <p className={priceText}>{"TODO: цена"}</p>;
  }

  const perKilo = pricePerKiloCents(priceCents, netWeightGrams);
  const perKiloText =
    perKilo === null ? null : (
      <span className="text-ink-soft text-sm font-normal">
        {formatPrice(perKilo)}/кг
      </span>
    );

  if (regularPriceCents === null) {
    return (
      <p
        className={`flex flex-wrap items-baseline gap-x-2 tabular-nums ${priceText}`}
      >
        <span>
          {formatPrice(priceCents)}
          {unit}
        </span>
        {perKiloText}
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

  const percent = discountPercent(priceCents, regularPriceCents);
  const badge = [
    percent === null ? null : `−${percent}%`,
    promotionEndsOn === null ? null : `до ${shortDay(promotionEndsOn)}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
      {promo}
      {regular}
      {badge && (
        <span className="bg-honey text-ink inline-flex h-5 items-center rounded-full px-2 text-xs leading-none font-semibold">
          {badge}
        </span>
      )}
      {perKiloText}
    </p>
  );
}
