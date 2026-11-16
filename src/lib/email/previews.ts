import {
  type CampaignProductData,
  promotionEmail,
  restockEmail,
} from "@/lib/email/campaign-templates";
import {
  type EmailMessage,
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  orderUpdatedEmail,
  ownerNotificationEmail,
  ownerWithdrawalEmail,
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
  codFeeCents: 250,
  totalCents: 5440,
  office: SAMPLE_OFFICE,
};

const SAMPLE_UNSUBSCRIBE = `${SITE_URL}/subscription/unsubscribe?token=preview`;

const SAMPLE_500G: CampaignProductData = {
  slug: "pchelen-prashets-500g",
  name: "Пчелен прашец 500 г",
  image: {
    path: "/products/pollen-500g-bag.jpg",
    alt: "Пакет пчелен прашец 500 г",
  },
  priceCents: 1200,
  regularPriceCents: null,
};

const SAMPLE_1KG: CampaignProductData = {
  slug: "pchelen-prashets-1kg",
  name: "Пчелен прашец 1 кг",
  image: {
    path: "/products/pollen-1kg-bag.jpg",
    alt: "Пакет пчелен прашец 1 кг",
  },
  priceCents: 2200,
  regularPriceCents: null,
};

const SAMPLE_RESTOCK = {
  text: "Тази седмица прибрахме нов прашец от акация и липа.\n\nПоръчайте сега, докато е пресен.",
  products: [SAMPLE_500G, SAMPLE_1KG],
  unsubscribeUrl: SAMPLE_UNSUBSCRIBE,
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
        codFeeCents: 0,
        totalCents: 4600,
      }),
  },
  {
    title: "Приета поръчка от абониран купувач — до купувача",
    trigger:
      "Когато купувач завърши поръчка, отметнал офертите при нея или при по-ранна поръчка.",
    render: () =>
      orderAcceptedEmail({
        ...SAMPLE_ORDER,
        unsubscribeUrl: `${SITE_URL}/subscription/unsubscribe?token=preview`,
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
      "Когато запишете редакция на нова поръчка и отметката за имейл в прозореца остане включена.",
    render: () => orderUpdatedEmail(SAMPLE_ORDER),
  },
  {
    title: "Обновена поръчка на абониран купувач — до купувача",
    trigger:
      "Когато запишете редакция на поръчка на абониран купувач и отметката за имейл в прозореца остане включена.",
    render: () =>
      orderUpdatedEmail({
        ...SAMPLE_ORDER,
        unsubscribeUrl: `${SITE_URL}/subscription/unsubscribe?token=preview`,
      }),
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
  {
    title: "Промоция — до абонатите",
    trigger:
      "Когато изпратите кампания „Промоция“ от страницата с кампании, до всеки абониран купувач.",
    render: () =>
      promotionEmail({
        text: "Само тази седмица прашецът е с 20% по-евтин.",
        product: { ...SAMPLE_500G, priceCents: 960, regularPriceCents: 1200 },
        startsOn: "2026-11-16",
        endsOn: "2026-11-22",
        unsubscribeUrl: SAMPLE_UNSUBSCRIBE,
      }),
  },
  {
    title: "Ново зареждане — до абонатите",
    trigger:
      "Когато изпратите кампания „Ново зареждане“, до всеки абониран купувач.",
    render: () => restockEmail(SAMPLE_RESTOCK),
  },
];
