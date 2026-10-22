import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-session";
import { EMAIL_DESIGNS, type EmailDesign } from "@/lib/email/layout";
import {
  type EmailMessage,
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  ownerNotificationEmail,
  withdrawalReceivedEmail,
} from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Имейли — преглед",
};

const SAMPLE_OFFICE = {
  name: "Павликени",
  street: "пл. Стефан Караджа №16",
};

const SAMPLE_ORDER: OrderEmailData = {
  reference: "BP2210261",
  contactName: "Мария Иванова",
  contactPhone: "+359899777888",
  email: "maria.ivanova@example.com",
  items: [
    { name: "Пчелен прашец 500 г", quantity: 2, unitPriceCents: 1200 },
    { name: "Пчелен прашец 1 кг", quantity: 1, unitPriceCents: 2200 },
  ],
  deliveryCents: 590,
  totalCents: 5190,
  office: SAMPLE_OFFICE,
};

const PREVIEWS: {
  title: string;
  render: (design: EmailDesign) => EmailMessage;
}[] = [
  {
    title: "Приета поръчка — до купувача",
    render: (design) => orderAcceptedEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Приета поръчка за Попово — до купувача",
    render: (design) =>
      orderAcceptedEmail(
        { ...SAMPLE_ORDER, office: null, deliveryCents: 0, totalCents: 4600 },
        design,
      ),
  },
  {
    title: "Нова поръчка — до собственика",
    render: (design) => ownerNotificationEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Изпратена — до купувача",
    render: (design) =>
      orderSentEmail({ ...SAMPLE_ORDER, office: SAMPLE_OFFICE }, design),
  },
  {
    title: "Отказана — до купувача",
    render: (design) => orderCancelledEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Получен отказ от договора — до купувача",
    render: (design) =>
      withdrawalReceivedEmail(
        {
          reference: SAMPLE_ORDER.reference,
          withdrawnAt: new Date("2026-10-22T07:30:00Z"),
          sent: false,
        },
        design,
      ),
  },
];

export default async function AdminEmails() {
  await requireAdmin();

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold">Имейли — два варианта</h1>
      <p className="text-ink-soft mt-2 max-w-prose">
        Всеки имейл в дизайн A и дизайн B, с примерна поръчка. Сайтът праща
        дизайн A, докато не изберете.
      </p>
      <Link
        href="/admin/orders"
        className="text-brand-deep mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        Към поръчките
      </Link>

      <div className="mt-6 flex flex-col gap-10">
        {PREVIEWS.map(({ title, render }) => (
          <section key={title} aria-label={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {EMAIL_DESIGNS.map((design) => {
                const message = render(design);

                return (
                  <figure key={design}>
                    <figcaption className="text-sm font-medium">
                      Дизайн {design} · Тема: {message.subject}
                    </figcaption>
                    <iframe
                      title={`${title}, дизайн ${design}`}
                      srcDoc={message.html.replaceAll(
                        `${SITE_URL}/email/`,
                        "/email/",
                      )}
                      sandbox=""
                      className="border-line mt-1 h-[40rem] w-full rounded-lg border bg-white"
                    />
                  </figure>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
