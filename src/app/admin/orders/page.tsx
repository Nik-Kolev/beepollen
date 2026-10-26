import type { Metadata } from "next";
import Link from "next/link";

import { AdminHeader } from "@/components/admin/admin-header";
import { HideClosedToggle } from "@/components/admin/hide-closed-toggle";
import { ORDER_LIST_ID } from "@/components/admin/order-list-id";
import {
  OrderSteps,
  type StepConfirmation,
} from "@/components/admin/order-steps";
import {
  CARRIER_LABEL,
  CONSENT_LABEL,
  countOrdersByView,
  daysAgoLabel,
  deliveryLabel,
  EMAIL_STATUS_LABEL,
  findPossibleDuplicates,
  formatOrderTime,
  listOrders,
  nextOrderShown,
  nextOrderSteps,
  ORDER_EVENT_LABEL,
  ORDER_FILTER_LABEL,
  ORDER_FILTERS,
  ORDER_STATUS_LABEL,
  ORDER_STEP_LABEL,
  orderListHref,
  ORDERS_STEP,
  orderStatus,
  type OrderStatus,
  type OrderStep,
  orderView,
  parseHideClosed,
  parseOrderFilter,
  parseOrderShown,
  undoTarget,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { DeliveryMethod } from "@/lib/delivery";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = {
  title: "Поръчки",
};

const DETAIL_HEADING =
  "text-ink-soft text-xs font-semibold tracking-wide uppercase";

const STATUS_BADGE: Record<OrderStatus, string> = {
  new: "bg-action text-action-ink",
  sent: "bg-surface text-ink ring-ink-soft ring-1",
  paid: "bg-leaf text-action-ink",
  returned: "bg-error text-action-ink",
  collected: "bg-ground text-ink-soft ring-line ring-1",
  cancelled: "bg-ground text-ink-soft ring-line ring-1",
};

const CLOSED: readonly OrderStatus[] = ["paid", "collected", "cancelled"];

const GUIDE: { status: OrderStatus; text: string }[] = [
  {
    status: "new",
    text: "Току-що поръчана. Натиснете „Изпратена“, когато я дадете на Еконт или Спиди, или „Откажи“, ако няма да я изпращате.",
  },
  {
    status: "sent",
    text: "Пратката е на път. Натиснете „Платена“, когато вземете парите от офиса на Еконт или Спиди, или „Върната“, ако купувачът не я е взел.",
  },
  {
    status: "returned",
    text: "Пратката се връща — приберете я от офиса на Еконт или Спиди и платете връщането, после натиснете „Прибрана“.",
  },
  {
    status: "paid",
    text: "Приключена — купувачът е взел пратката и вие сте взели парите.",
  },
  {
    status: "cancelled",
    text: "Приключена — отказана от купувача или от вас. Пратката е при вас и плащане няма.",
  },
];

function stepConfirmations(
  order: Parameters<typeof undoTarget>[0] & {
    reference: string;
    contactName: string;
    withdrawnAt: Date | null;
  },
  status: OrderStatus,
): Partial<Record<OrderStep, StepConfirmation>> {
  const subject = `Поръчка ${order.reference} на ${order.contactName}`;
  const target = undoTarget(order);
  const withdrawal =
    order.withdrawnAt &&
    `Купувачът заяви отказ от ${order.reference} на ${formatOrderTime(order.withdrawnAt)}.`;
  return {
    send: withdrawal
      ? {
          text: `${withdrawal} Изпратете я само ако сте се разбрали с ${order.contactName} по телефона.`,
          confirm: "Да, изпрати",
          notify: true,
          confirmsWithdrawal: true,
        }
      : {
          text: `${subject} ще се отбележи като изпратена.`,
          confirm: "Да, изпратена е",
          notify: true,
        },
    ...(withdrawal && {
      handOver: {
        text: `${withdrawal} Предайте я само ако сте се разбрали с ${order.contactName} по телефона.`,
        confirm: "Да, предадена е",
        confirmsWithdrawal: true,
      },
    }),
    cancel: {
      text: `${subject} ще бъде отказана и няма да се изпраща.`,
      confirm: "Да, откажи",
      notify: true,
    },
    return: {
      text: `${subject} ще се отбележи като върната. След това трябва да я приберете от офиса и да платите връщането.`,
      confirm: "Да, върната е",
    },
    ...(target && {
      undo: {
        text: `${subject} ще се върне от „${ORDER_STATUS_LABEL[status]}“ на „${ORDER_STATUS_LABEL[target]}“.`,
        confirm: "Да, върни",
      },
    }),
  };
}

const STAMPS = [
  ["sentAt", "Изпратена"],
  ["paidAt", "Платена"],
  ["cancelledAt", "Отказана или върната"],
  ["collectedAt", "Прибрана"],
] as const;

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  const { email } = await requireAdmin();
  const params = await searchParams;
  const filter = parseOrderFilter(params.filter);
  const hideClosed = filter === "all" && parseHideClosed(params.open);
  const view = orderView(filter, hideClosed);
  const counts = await countOrdersByView();
  const shown = parseOrderShown(params.shown, counts[view]);
  const orders = await listOrders(view, shown);
  const next = nextOrderShown(orders.length, counts[view]);
  const duplicates = await findPossibleDuplicates(orders);
  const now = new Date();

  return (
    <div className="w-full">
      <AdminHeader
        title="Поръчки"
        email={email}
        current="/admin/orders"
        legend="Под всяка поръчка е следващата ѝ стъпка — натиснете я, когато се случи."
      />

      <details className="group bg-surface ring-line mt-4 rounded-xl px-4 py-1 shadow-sm ring-1">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className="text-brand-deep text-2xl leading-none transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          Как върви една поръчка
        </summary>
        <dl className="mt-2 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          {GUIDE.map(({ status, text }) => (
            <div key={status} className="contents">
              <dt>
                <span
                  className={`${STATUS_BADGE[status]} inline-block rounded-full px-3 py-0.5 font-semibold`}
                >
                  {ORDER_STATUS_LABEL[status]}
                </span>
              </dt>
              <dd className="-mt-1.5 sm:mt-0.5">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="border-line mt-3 mb-3 border-t pt-3 text-sm">
          За Попово има една стъпка — „{ORDER_STEP_LABEL.handOver}“, когато я
          предадете и вземете парите. „{ORDER_STEP_LABEL.undo}“ отменя
          последната стъпка, ако сте натиснали погрешно. „
          {ORDER_STEP_LABEL.cancel}“, „{ORDER_STEP_LABEL.return}“ и „
          {ORDER_STEP_LABEL.undo}“ първо питат дали сте сигурни.
        </p>
        <p className="mb-3 text-sm">
          „Заявен отказ“ значи, че купувачът се е отказал от поръчката през
          сайта. Ако още не е изпратена, не я изпращайте — „
          {ORDER_STEP_LABEL.send}“ и „{ORDER_STEP_LABEL.handOver}“ първо питат
          дали сте сигурни. Ако вече е изпратена, обадете се, за да уговорите
          връщането.
        </p>
        <p className="mb-3 text-sm">
          „Възможен дубликат“ значи, че същият имейл е поръчал още веднъж в
          рамките на 24 часа. Обадете се, преди да изпратите и двете — може
          купувачът да е натиснал два пъти.
        </p>
        <p className="mb-3 text-sm">
          „{ORDER_FILTER_LABEL.all}“ показва всички поръчки, най-новите
          най-отгоре. Отметката „Скрий приключените“ оставя само тези, които още
          чакат нещо от вас.
        </p>
      </details>

      <nav aria-label="Филтър на поръчките" className="mt-4">
        <ul role="list" className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((option) => (
            <li key={option}>
              <Link
                href={orderListHref(option, ORDERS_STEP)}
                aria-current={option === filter ? "page" : undefined}
                className={`${option === filter ? "bg-brand-deep border-brand-deep text-action-ink" : "bg-surface border-line hover:border-brand-deep"} inline-flex min-h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-colors`}
              >
                {ORDER_FILTER_LABEL[option]}
                <span className="tabular-nums">{counts[option]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {filter === "all" && (
        <HideClosedToggle
          checked={hideClosed}
          checkedHref={orderListHref("all", ORDERS_STEP, true)}
          uncheckedHref={orderListHref("all", ORDERS_STEP)}
        />
      )}

      <section
        id={ORDER_LIST_ID}
        tabIndex={-1}
        aria-label="Поръчки"
        className="rounded-xl"
      >
        {orders.length === 0 ? (
          <p className="text-ink-soft mt-8">
            {view === "all"
              ? "Още няма поръчки."
              : view === "open"
                ? "Няма поръчки, които чакат нещо от вас."
                : "Няма такива поръчки."}
          </p>
        ) : (
          <ul
            role="list"
            className="mt-4 flex flex-col gap-3 [overflow-anchor:none]"
          >
            {orders.map((order) => {
              const offers = order.consents.find(
                (consent) => consent.kind === "OFFERS",
              );
              const status = orderStatus(order);
              const duplicateOf = duplicates.get(order.reference);

              return (
                <li key={order.reference}>
                  <article
                    className={`${CLOSED.includes(status) ? "bg-ground" : "bg-surface"} ring-line rounded-xl p-4 shadow-sm ring-1`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="font-semibold tabular-nums">
                          {order.reference}
                        </h2>
                        <span
                          className={`${STATUS_BADGE[status]} rounded-full px-3 py-0.5 text-sm font-semibold`}
                        >
                          {ORDER_STATUS_LABEL[status]}
                        </span>
                      </div>
                      <span className="text-brand-deep text-lg font-semibold tabular-nums">
                        {formatPrice(order.totalCents)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{order.contactName}</span>
                      <span className="text-ink-soft">
                        {" "}
                        · {deliveryLabel(order)} ·{" "}
                        <time
                          dateTime={order.createdAt.toISOString()}
                          className="tabular-nums"
                        >
                          {formatOrderTime(order.createdAt)}
                        </time>
                      </span>
                    </p>
                    {order.withdrawnAt && (
                      <p className="text-error mt-1 text-sm font-semibold">
                        Заявен отказ ·{" "}
                        <time
                          dateTime={order.withdrawnAt.toISOString()}
                          className="tabular-nums"
                        >
                          {formatOrderTime(order.withdrawnAt)}
                        </time>
                        {order.withdrawalName && ` · ${order.withdrawalName}`}
                      </p>
                    )}
                    {duplicateOf && (
                      <p className="text-error mt-1 text-sm font-semibold">
                        Възможен дубликат на{" "}
                        <span className="tabular-nums">{duplicateOf}</span>
                      </p>
                    )}
                    {status === "sent" && order.sentAt && (
                      <p className="mt-1 text-sm font-semibold">
                        {daysAgoLabel("Изпратена", order.sentAt, now)}
                      </p>
                    )}
                    {status === "returned" && order.cancelledAt && (
                      <p className="text-error mt-1 text-sm font-semibold">
                        {daysAgoLabel("Върната", order.cancelledAt, now)}
                      </p>
                    )}

                    <OrderSteps
                      reference={order.reference}
                      status={status}
                      steps={nextOrderSteps(order)}
                      labels={ORDER_STEP_LABEL}
                      canUndo={undoTarget(order) !== null}
                      confirmations={stepConfirmations(order, status)}
                    />

                    <details className="group border-line mt-3 border-t pt-2">
                      <summary className="text-brand-deep inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium">
                        <span
                          aria-hidden="true"
                          className="text-2xl leading-none transition-transform group-open:rotate-90"
                        >
                          ▸
                        </span>
                        Детайли
                      </summary>

                      <div className="mt-2 grid gap-5 text-sm sm:grid-cols-2">
                        <section>
                          <h3 className={DETAIL_HEADING}>Клиент</h3>
                          <p className="mt-1 font-medium">
                            {order.contactName}
                          </p>
                          <p>
                            <a
                              href={`tel:${order.contactPhone}`}
                              className="text-brand-deep underline underline-offset-4"
                            >
                              {order.contactPhone}
                            </a>
                          </p>
                          <p className="break-all">
                            <a
                              href={`mailto:${order.customer.email}`}
                              className="text-brand-deep underline underline-offset-4"
                            >
                              {order.customer.email}
                            </a>
                          </p>
                        </section>

                        <section>
                          <h3 className={DETAIL_HEADING}>Доставка</h3>
                          {order.deliveryMethod === DeliveryMethod.LOCAL ? (
                            <p className="mt-1">
                              {deliveryLabel(order)}, уговаря се по телефона.
                            </p>
                          ) : (
                            <>
                              <p className="mt-1 font-medium">
                                {order.officeName}
                              </p>
                              <p>
                                {order.officeCity}, {order.officeStreet}
                              </p>
                              <p className="text-ink-soft">
                                {order.officeCarrier &&
                                  CARRIER_LABEL[order.officeCarrier]}
                                , офис {order.officeCode}
                              </p>
                            </>
                          )}
                        </section>

                        <section className="sm:col-span-2">
                          <h3 className={DETAIL_HEADING}>Продукти</h3>
                          <ul
                            role="list"
                            className="border-line divide-line mt-1 divide-y border-y"
                          >
                            {order.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex flex-wrap items-baseline justify-between gap-x-4 py-2"
                              >
                                <span>
                                  {item.name}{" "}
                                  <span className="text-ink-soft tabular-nums">
                                    {item.quantity} ×{" "}
                                    {formatPrice(item.unitPriceCents)}
                                  </span>
                                </span>
                                <span className="tabular-nums">
                                  {formatPrice(
                                    item.quantity * item.unitPriceCents,
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 tabular-nums">
                            <dt className="text-ink-soft">Продукти</dt>
                            <dd className="text-right">
                              {formatPrice(order.itemsCents)}
                            </dd>
                            <dt className="text-ink-soft">Доставка</dt>
                            <dd className="text-right">
                              {formatPrice(order.deliveryCents)}
                            </dd>
                            <dt className="font-semibold">Общо</dt>
                            <dd className="text-brand-deep text-right font-semibold">
                              {formatPrice(order.totalCents)}
                            </dd>
                          </dl>
                        </section>

                        <section>
                          <h3 className={DETAIL_HEADING}>Отбелязана</h3>
                          <ul role="list" className="mt-1">
                            {STAMPS.filter(
                              ([field]) =>
                                field !== "collectedAt" ||
                                order.deliveryMethod !== DeliveryMethod.LOCAL,
                            ).map(([field, label]) => {
                              const markedAt = order[field];
                              return (
                                <li key={field}>
                                  {field === "sentAt" &&
                                  order.deliveryMethod === DeliveryMethod.LOCAL
                                    ? "Предадена"
                                    : label}
                                  :{" "}
                                  {markedAt ? (
                                    <time
                                      dateTime={markedAt.toISOString()}
                                      className="tabular-nums"
                                    >
                                      {formatOrderTime(markedAt)}
                                    </time>
                                  ) : (
                                    <span className="text-ink-soft">не</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </section>

                        <section>
                          <h3 className={DETAIL_HEADING}>Съгласия</h3>
                          <ul role="list" className="mt-1 flex flex-col gap-2">
                            {order.consents.map((consent) => (
                              <li key={consent.kind}>
                                <p className="font-medium">
                                  {CONSENT_LABEL[consent.kind]}
                                </p>
                                <p className="text-ink-soft">
                                  „{consent.wording}“ ·{" "}
                                  <time
                                    dateTime={consent.createdAt.toISOString()}
                                    className="tabular-nums"
                                  >
                                    {formatOrderTime(consent.createdAt)}
                                  </time>
                                  {consent.ipAddress &&
                                    ` · IP ${consent.ipAddress}`}
                                </p>
                                {consent.kind === "OFFERS" && (
                                  <p className="text-ink-soft">
                                    {consent.withdrawnAt ? (
                                      <>
                                        Отписан на{" "}
                                        <time
                                          dateTime={consent.withdrawnAt.toISOString()}
                                          className="tabular-nums"
                                        >
                                          {formatOrderTime(consent.withdrawnAt)}
                                        </time>
                                      </>
                                    ) : consent.confirmedAt ? (
                                      <>
                                        Потвърдено на{" "}
                                        <time
                                          dateTime={consent.confirmedAt.toISOString()}
                                          className="tabular-nums"
                                        >
                                          {formatOrderTime(consent.confirmedAt)}
                                        </time>
                                      </>
                                    ) : (
                                      "Не е потвърдено от имейла"
                                    )}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                          {!offers && (
                            <p className="text-ink-soft mt-2">
                              Без съгласие за оферти по имейл.
                            </p>
                          )}
                        </section>

                        <section className="sm:col-span-2">
                          <h3 className={DETAIL_HEADING}>История</h3>
                          <ol role="list" className="mt-1 flex flex-col gap-1">
                            {order.events.map((event) => (
                              <li key={event.id}>
                                <time
                                  dateTime={event.createdAt.toISOString()}
                                  className="tabular-nums"
                                >
                                  {formatOrderTime(event.createdAt)}
                                </time>{" "}
                                · {ORDER_EVENT_LABEL[event.kind]}
                                {event.adminEmail && (
                                  <span className="text-ink-soft break-all">
                                    {" "}
                                    · {event.adminEmail}
                                  </span>
                                )}
                                {event.emailStatus && (
                                  <span
                                    className={
                                      event.emailStatus === "FAILED"
                                        ? "text-error font-medium"
                                        : "text-ink-soft"
                                    }
                                  >
                                    {" "}
                                    · {EMAIL_STATUS_LABEL[event.emailStatus]}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </section>
                      </div>
                    </details>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {orders.length < counts[view] && (
        <div className="mt-6 flex flex-col items-center gap-2">
          {next !== null && (
            <Link
              href={orderListHref(filter, next, hideClosed)}
              scroll={false}
              className="border-line bg-surface hover:border-brand-deep inline-flex min-h-11 items-center rounded-md border-2 px-6 font-semibold shadow-sm transition-colors"
            >
              Зареди още {Math.min(next, counts[view]) - orders.length}
            </Link>
          )}
          <p className="text-ink-soft text-sm tabular-nums">
            Показани {orders.length} от {counts[view]}
          </p>
        </div>
      )}
    </div>
  );
}
