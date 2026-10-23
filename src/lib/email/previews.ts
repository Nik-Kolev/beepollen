import type { EmailDesign } from "@/lib/email/layout";
import {
  type EmailMessage,
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  ownerNotificationEmail,
  subscriptionConfirmEmail,
  withdrawalReceivedEmail,
} from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site";

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

export const PREVIEWS: {
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
    title: "Приета поръчка от абониран купувач — до купувача",
    render: (design) =>
      orderAcceptedEmail(
        {
          ...SAMPLE_ORDER,
          unsubscribeUrl: `${SITE_URL}/subscription/unsubscribe?token=preview`,
        },
        design,
      ),
  },
  {
    title: "Потвърждаване на абонамента — до купувача",
    render: (design) =>
      subscriptionConfirmEmail(
        {
          reference: SAMPLE_ORDER.reference,
          confirmUrl: `${SITE_URL}/subscription/confirm?token=preview`,
        },
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
