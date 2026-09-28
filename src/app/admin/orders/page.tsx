import type { Metadata } from "next";
import Link from "next/link";

import { OrderMarkToggle } from "@/components/admin/order-mark-toggle";
import {
  countOrdersByFilter,
  deliveryLabel,
  formatOrderTime,
  listOrders,
  ORDER_FILTER_LABEL,
  ORDER_FILTERS,
  ORDER_MARK_FIELD,
  ORDER_MARK_LABEL,
  ORDER_MARKS,
  parseOrderFilter,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { formatPrice } from "@/lib/money";

import { signOutOfAdmin } from "../actions";

export const metadata: Metadata = {
  title: "Поръчки",
};

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  const { email } = await requireAdmin();
  const filter = parseOrderFilter((await searchParams).filter);
  const [orders, counts] = await Promise.all([
    listOrders(filter),
    countOrdersByFilter(),
  ]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Поръчки</h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-ink-soft text-sm">{email}</p>
          <form action={signOutOfAdmin}>
            <button
              type="submit"
              className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
            >
              Изход
            </button>
          </form>
        </div>
      </div>

      <nav aria-label="Филтър на поръчките" className="mt-6">
        <ul role="list" className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((option) => (
            <li key={option}>
              <Link
                href={
                  option === "all"
                    ? "/admin/orders"
                    : `/admin/orders?filter=${option}`
                }
                aria-current={option === filter ? "page" : undefined}
                className={`${option === filter ? "bg-brand-deep border-brand-deep text-action-ink" : "bg-surface border-line hover:border-brand-deep"} inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors`}
              >
                {ORDER_FILTER_LABEL[option]}
                <span className="tabular-nums">{counts[option]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="text-ink-soft mt-8">
          {filter === "all" ? "Още няма поръчки." : "Няма такива поръчки."}
        </p>
      ) : (
        <ul role="list" className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.reference}>
              <article
                className={`${order.cancelledAt ? "bg-ground" : "bg-surface"} border-line hover:border-brand-deep relative rounded-md border p-4 transition-colors`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-semibold tabular-nums">
                    <Link
                      href={`/admin/orders/${order.reference}`}
                      className="after:absolute after:inset-0"
                    >
                      {order.reference}
                    </Link>
                  </h2>
                  <span className="text-brand-deep font-semibold tabular-nums">
                    {formatPrice(order.totalCents)}
                  </span>
                </div>
                <p className="mt-1 font-medium">{order.contactName}</p>
                <p className="text-ink-soft mt-1 text-sm">
                  {deliveryLabel(order)}
                </p>
                <time
                  dateTime={order.createdAt.toISOString()}
                  className="text-ink-soft mt-1 block text-sm tabular-nums"
                >
                  {formatOrderTime(order.createdAt)}
                </time>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ORDER_MARKS.map((mark) => (
                    <OrderMarkToggle
                      key={mark}
                      reference={order.reference}
                      mark={mark}
                      label={ORDER_MARK_LABEL[mark]}
                      on={order[ORDER_MARK_FIELD[mark]] !== null}
                    />
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
