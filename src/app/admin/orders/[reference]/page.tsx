import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderMarkToggle } from "@/components/admin/order-mark-toggle";
import { notFoundMetadata } from "@/components/not-found-content";
import {
  CARRIER_LABEL,
  CONSENT_LABEL,
  deliveryLabel,
  formatOrderTime,
  getOrderByReference,
  ORDER_MARK_FIELD,
  ORDER_MARK_LABEL,
  ORDER_MARKS,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { DeliveryMethod } from "@/lib/delivery";
import { formatPrice } from "@/lib/money";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[reference]">): Promise<Metadata> {
  await requireAdmin();
  const { reference } = await params;
  const order = await getOrderByReference(reference);

  return order ? { title: `Поръчка ${order.reference}` } : notFoundMetadata;
}

const SECTION_HEADING = "text-lg font-semibold";

export default async function AdminOrder({
  params,
}: PageProps<"/admin/orders/[reference]">) {
  await requireAdmin();
  const { reference } = await params;
  const order = await getOrderByReference(reference);

  if (!order) notFound();

  const offers = order.consents.find((consent) => consent.kind === "OFFERS");
  const consents = [
    ...order.consents.filter((consent) => consent.kind === "TERMS"),
    ...(offers ? [offers] : []),
  ];

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <Link
          href="/admin/orders"
          className="text-brand-deep text-sm font-medium underline underline-offset-4"
        >
          Всички поръчки
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tabular-nums">
          Поръчка {order.reference}
        </h1>
        <p className="text-ink-soft mt-1 text-sm tabular-nums">
          <time dateTime={order.createdAt.toISOString()}>
            {formatOrderTime(order.createdAt)}
          </time>
        </p>
        <ul role="list" className="mt-4 flex flex-col gap-2">
          {ORDER_MARKS.map((mark) => {
            const markedAt = order[ORDER_MARK_FIELD[mark]];
            return (
              <li key={mark} className="flex flex-wrap items-center gap-3">
                <OrderMarkToggle
                  reference={order.reference}
                  mark={mark}
                  label={ORDER_MARK_LABEL[mark]}
                  on={markedAt !== null}
                />
                {markedAt && (
                  <time
                    dateTime={markedAt.toISOString()}
                    className="text-ink-soft text-sm tabular-nums"
                  >
                    {formatOrderTime(markedAt)}
                  </time>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <section aria-labelledby="order-items">
        <h2 id="order-items" className={SECTION_HEADING}>
          Продукти
        </h2>
        <ul
          role="list"
          className="border-line divide-line mt-3 divide-y border-y"
        >
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-ink-soft text-sm tabular-nums">
                  {item.quantity} × {formatPrice(item.unitPriceCents)}
                </p>
              </div>
              <span className="tabular-nums">
                {formatPrice(item.quantity * item.unitPriceCents)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
          <dt className="text-ink-soft">Продукти</dt>
          <dd className="text-right">{formatPrice(order.itemsCents)}</dd>
          <dt className="text-ink-soft">Доставка</dt>
          <dd className="text-right">{formatPrice(order.deliveryCents)}</dd>
          <dt className="font-semibold">Общо</dt>
          <dd className="text-brand-deep text-right font-semibold">
            {formatPrice(order.totalCents)}
          </dd>
        </dl>
      </section>

      <section aria-labelledby="order-contact">
        <h2 id="order-contact" className={SECTION_HEADING}>
          Клиент
        </h2>
        <p className="mt-3 font-medium">{order.contactName}</p>
        <p className="mt-1">
          <a
            href={`tel:${order.contactPhone}`}
            className="text-brand-deep underline underline-offset-4"
          >
            {order.contactPhone}
          </a>
        </p>
        <p className="mt-1 break-all">
          <a
            href={`mailto:${order.customer.email}`}
            className="text-brand-deep underline underline-offset-4"
          >
            {order.customer.email}
          </a>
        </p>
      </section>

      <section aria-labelledby="order-delivery">
        <h2 id="order-delivery" className={SECTION_HEADING}>
          Доставка
        </h2>
        {order.deliveryMethod === DeliveryMethod.LOCAL ? (
          <p className="mt-3">
            {deliveryLabel(order)}, уговаря се по телефона.
          </p>
        ) : (
          <div className="mt-3">
            <p className="font-medium">{order.officeName}</p>
            <p>
              {order.officeCity}, {order.officeStreet}
            </p>
            <p className="text-ink-soft mt-1 text-sm">
              {order.officeCarrier && CARRIER_LABEL[order.officeCarrier]}, офис{" "}
              {order.officeCode}
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="order-consents">
        <h2 id="order-consents" className={SECTION_HEADING}>
          Съгласия
        </h2>
        <ul role="list" className="mt-3 flex flex-col gap-4">
          {consents.map((consent) => (
            <li key={consent.kind}>
              <p className="font-medium">{CONSENT_LABEL[consent.kind]}</p>
              <p className="mt-1">„{consent.wording}“</p>
              <p className="text-ink-soft mt-1 text-sm tabular-nums">
                <time dateTime={consent.createdAt.toISOString()}>
                  {formatOrderTime(consent.createdAt)}
                </time>{" "}
                · IP {consent.ipAddress ?? "неизвестен"}
              </p>
            </li>
          ))}
        </ul>
        {!offers && (
          <p className="text-ink-soft mt-4 text-sm">
            Без съгласие за оферти по имейл.
          </p>
        )}
      </section>
    </div>
  );
}
