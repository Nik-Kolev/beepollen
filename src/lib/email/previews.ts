import type { EmailDesign } from "@/lib/email/layout";
import {
  type EmailMessage,
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  ownerNotificationEmail,
  ownerWithdrawalEmail,
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
  trigger: string;
  render: (design: EmailDesign) => EmailMessage;
}[] = [
  {
    title: "Приета поръчка — до купувача",
    trigger: "Когато купувач завърши поръчка с доставка до офис на Еконт.",
    render: (design) => orderAcceptedEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Приета поръчка за Попово — до купувача",
    trigger: "Когато купувач завърши поръчка за Попово, с доставка на ръка.",
    render: (design) =>
      orderAcceptedEmail(
        { ...SAMPLE_ORDER, office: null, deliveryCents: 0, totalCents: 4600 },
        design,
      ),
  },
  {
    title: "Приета поръчка от абониран купувач — до купувача",
    trigger: "Когато купувач, вече абониран за офертите, завърши поръчка.",
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
    trigger: "Когато купувач отметне офертите при поръчка и още не е абониран.",
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
    trigger: "До вас, при всяка нова поръчка.",
    render: (design) => ownerNotificationEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Изпратена — до купувача",
    trigger:
      "Когато натиснете „Изпратена“ за поръчка до офис на Еконт и отметката за имейл в прозореца остане включена. При „Предадена и платена“ за Попово не се праща имейл.",
    render: (design) =>
      orderSentEmail({ ...SAMPLE_ORDER, office: SAMPLE_OFFICE }, design),
  },
  {
    title: "Отказана — до купувача",
    trigger:
      "Когато натиснете „Откажи“ за поръчка и отметката за имейл в прозореца остане включена.",
    render: (design) => orderCancelledEmail(SAMPLE_ORDER, design),
  },
  {
    title: "Получен отказ от договора — до купувача",
    trigger:
      "Когато купувач подаде отказ от сайта за поръчка, която още не е нито изпратена, нито предадена.",
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
  {
    title: "Отказ от договора — до собственика",
    trigger: "До вас, когато купувач подаде отказ от сайта.",
    render: (design) =>
      ownerWithdrawalEmail(
        {
          reference: SAMPLE_ORDER.reference,
          withdrawnAt: new Date("2026-10-22T07:30:00Z"),
          sent: false,
          withdrawalName: SAMPLE_ORDER.contactName,
          contactPhone: SAMPLE_ORDER.contactPhone,
          email: SAMPLE_ORDER.email,
        },
        design,
      ),
  },
  {
    title: "Получен отказ от договора след изпращане — до купувача",
    trigger:
      "Когато купувач подаде отказ от сайта за поръчка, която вече е изпратена или предадена.",
    render: (design) =>
      withdrawalReceivedEmail(
        {
          reference: SAMPLE_ORDER.reference,
          withdrawnAt: new Date("2026-10-22T07:30:00Z"),
          sent: true,
        },
        design,
      ),
  },
];
