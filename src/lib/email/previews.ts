import {
  type EmailMessage,
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  orderUpdatedEmail,
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
  render: () => EmailMessage;
}[] = [
  {
    title: "Приета поръчка — до купувача",
    trigger: "Когато купувач завърши поръчка с доставка до офис на Еконт.",
    render: () => orderAcceptedEmail(SAMPLE_ORDER),
  },
  {
    title: "Приета поръчка за Попово — до купувача",
    trigger: "Когато купувач завърши поръчка за Попово, с доставка на ръка.",
    render: () =>
      orderAcceptedEmail({
        ...SAMPLE_ORDER,
        office: null,
        deliveryCents: 0,
        totalCents: 4600,
      }),
  },
  {
    title: "Приета поръчка от абониран купувач — до купувача",
    trigger: "Когато купувач, вече абониран за офертите, завърши поръчка.",
    render: () =>
      orderAcceptedEmail({
        ...SAMPLE_ORDER,
        unsubscribeUrl: `${SITE_URL}/subscription/unsubscribe?token=preview`,
      }),
  },
  {
    title: "Потвърждаване на абонамента — до купувача",
    trigger: "Когато купувач отметне офертите при поръчка и още не е абониран.",
    render: () =>
      subscriptionConfirmEmail({
        reference: SAMPLE_ORDER.reference,
        confirmUrl: `${SITE_URL}/subscription/confirm?token=preview`,
      }),
  },
  {
    title: "Нова поръчка — до собственика",
    trigger: "До вас, при всяка нова поръчка.",
    render: () => ownerNotificationEmail(SAMPLE_ORDER),
  },
  {
    title: "Изпратена — до купувача",
    trigger:
      "Когато натиснете „Изпратена“ за поръчка до офис на Еконт и отметката за имейл в прозореца остане включена. При „Предадена и платена“ за Попово не се праща имейл.",
    render: () => orderSentEmail({ ...SAMPLE_ORDER, office: SAMPLE_OFFICE }),
  },
  {
    title: "Обновена поръчка — до купувача",
    trigger:
      "Когато запишете редакция на нова поръчка и отметката за имейл в прозореца остане включена. Ако сте сменили имейла и купувачът е отметнал офертите, на новия адрес отива и потвърждението на абонамента.",
    render: () => orderUpdatedEmail(SAMPLE_ORDER),
  },
  {
    title: "Отказана — до купувача",
    trigger:
      "Когато натиснете „Откажи“ за поръчка и отметката за имейл в прозореца остане включена.",
    render: () => orderCancelledEmail(SAMPLE_ORDER),
  },
  {
    title: "Получен отказ от договора — до купувача",
    trigger:
      "Когато купувач подаде отказ от сайта за поръчка, която още не е нито изпратена, нито предадена.",
    render: () =>
      withdrawalReceivedEmail({
        reference: SAMPLE_ORDER.reference,
        withdrawnAt: new Date("2026-10-22T07:30:00Z"),
        sent: false,
      }),
  },
  {
    title: "Отказ от договора — до собственика",
    trigger: "До вас, когато купувач подаде отказ от сайта.",
    render: () =>
      ownerWithdrawalEmail({
        reference: SAMPLE_ORDER.reference,
        withdrawnAt: new Date("2026-10-22T07:30:00Z"),
        sent: false,
        withdrawalName: SAMPLE_ORDER.contactName,
        contactPhone: SAMPLE_ORDER.contactPhone,
        email: SAMPLE_ORDER.email,
      }),
  },
  {
    title: "Получен отказ от договора след изпращане — до купувача",
    trigger:
      "Когато купувач подаде отказ от сайта за поръчка, която вече е изпратена или предадена.",
    render: () =>
      withdrawalReceivedEmail({
        reference: SAMPLE_ORDER.reference,
        withdrawnAt: new Date("2026-10-22T07:30:00Z"),
        sent: true,
      }),
  },
];
