import type { Metadata } from "next";
import Link from "next/link";

import {
  deliveryLabel,
  formatOrderTime,
  listOrders,
  ORDER_STATUS_LABEL,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { formatPrice } from "@/lib/money";

import { signOutOfAdmin } from "../actions";

export const metadata: Metadata = {
  title: "Поръчки",
};

export default async function AdminOrders() {
  const { email } = await requireAdmin();
  const orders = await listOrders();

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

      {orders.length === 0 ? (
        <p className="text-ink-soft mt-8">Още няма поръчки.</p>
      ) : (
        <ul role="list" className="mt-8 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.reference}>
              <Link
                href={`/admin/orders/${order.reference}`}
                className="bg-surface border-line hover:border-brand-deep block rounded-md border p-4 transition-colors"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-semibold tabular-nums">
                    {order.reference}
                  </span>
                  <span className="text-sm">
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="mt-1 font-medium">{order.contactName}</p>
                <p className="text-ink-soft mt-1 text-sm">
                  {deliveryLabel(order)}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <time
                    dateTime={order.createdAt.toISOString()}
                    className="text-ink-soft text-sm tabular-nums"
                  >
                    {formatOrderTime(order.createdAt)}
                  </time>
                  <span className="text-brand-deep font-semibold tabular-nums">
                    {formatPrice(order.totalCents)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
