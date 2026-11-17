import {
  COD_FEE_LABEL,
  DISPATCH_NOTE,
  LOCAL_DELIVERY_CITY,
} from "@/lib/delivery";
import {
  EMAIL_COLOR,
  escapeHtml,
  renderLayout,
  textFooter,
} from "@/lib/email/layout";
import { formatPrice } from "@/lib/money";
import { CONTACT_EMAIL, OWNER_PHONE, SELLER, SITE_URL } from "@/lib/site";
import { formatWithdrawalTime } from "@/lib/withdrawal-messages";
import {
  CONFORMITY,
  REFUND_TERMS,
  RETURN_TERMS,
  WITHDRAWAL_RIGHT,
} from "@/lib/withdrawal-terms";

export type OrderEmailData = {
  reference: string;
  contactName: string;
  contactPhone: string;
  email: string;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  deliveryCents: number;
  codFeeCents: number;
  totalCents: number;
  office: { name: string; street: string } | null;
  unsubscribeUrl?: string;
};

export type WithdrawalEmailData = {
  reference: string;
  withdrawnAt: Date;
  sent: boolean;
  local: boolean;
  contactPhone: string;
  email: string;
};

export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

const CELL = `padding:8px 0;border-bottom:1px solid ${EMAIL_COLOR.line};`;

function paragraph(html: string) {
  return `<p style="margin:0 0 16px;">${html}</p>`;
}

function officeText(office: { name: string; street: string }) {
  return `${office.name}, ${office.street}`;
}

function summaryHtml(rows: [label: string, value: string][]) {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
  <td style="padding:4px 12px 4px 0;color:${EMAIL_COLOR.inkSoft};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:4px 0;font-weight:bold;">${escapeHtml(value)}</td>
</tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:${EMAIL_COLOR.ground};border-radius:8px;">
<tr><td style="padding:12px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
${cells}
</table>
</td></tr>
</table>`;
}

function deliveryShort(order: Pick<OrderEmailData, "office">) {
  return order.office
    ? `Еконт, ${officeText(order.office)}`
    : `На ръка, гр. ${LOCAL_DELIVERY_CITY}`;
}

function orderSummary(order: OrderEmailData) {
  return summaryHtml([
    ["Поръчка", order.reference],
    ["Общо", formatPrice(order.totalCents)],
    ["Доставка", deliveryShort(order)],
    ["Плащане", "при получаване"],
  ]);
}

function linesHtml(order: OrderEmailData) {
  const rows = order.items
    .map(
      (item) => `<tr>
  <td style="${CELL}">${escapeHtml(item.name)}<br><span style="color:${EMAIL_COLOR.inkSoft};white-space:nowrap;">${item.quantity} × ${formatPrice(item.unitPriceCents)}</span></td>
  <td align="right" style="${CELL}white-space:nowrap;">${formatPrice(item.quantity * item.unitPriceCents)}</td>
</tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-top:1px solid ${EMAIL_COLOR.line};">
${rows}
<tr>
  <td style="padding:8px 0 0;color:${EMAIL_COLOR.inkSoft};">Доставка</td>
  <td align="right" style="padding:8px 0 0;white-space:nowrap;">${order.deliveryCents === 0 ? "Безплатна" : formatPrice(order.deliveryCents)}</td>
</tr>
${
  order.codFeeCents > 0
    ? `<tr>
  <td style="padding:8px 0 0;color:${EMAIL_COLOR.inkSoft};">${COD_FEE_LABEL}</td>
  <td align="right" style="padding:8px 0 0;white-space:nowrap;">${formatPrice(order.codFeeCents)}</td>
</tr>
`
    : ""
}<tr>
  <td style="padding:8px 0 0;font-weight:bold;">Общо</td>
  <td align="right" style="padding:8px 0 0;font-weight:bold;color:${EMAIL_COLOR.action};white-space:nowrap;">${formatPrice(order.totalCents)}</td>
</tr>
</table>`;
}

function linesText(order: OrderEmailData) {
  return [
    ...order.items.map(
      (item) =>
        `${item.name} — ${item.quantity} × ${formatPrice(item.unitPriceCents)} = ${formatPrice(item.quantity * item.unitPriceCents)}`,
    ),
    `Доставка: ${order.deliveryCents === 0 ? "безплатна" : formatPrice(order.deliveryCents)}`,
    ...(order.codFeeCents > 0
      ? [`${COD_FEE_LABEL}: ${formatPrice(order.codFeeCents)}`]
      : []),
    `Общо: ${formatPrice(order.totalCents)}`,
  ].join("\n");
}

function deliverySentence(order: OrderEmailData) {
  return order.office
    ? `Ще изпратим поръчката до офис на Еконт: ${officeText(order.office)}. ${DISPATCH_NOTE}`
    : `Ще се свържем с вас по телефона, за да уговорим доставката в гр. ${LOCAL_DELIVERY_CITY}.`;
}

function link(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="color:${EMAIL_COLOR.action};">${escapeHtml(label)}</a>`;
}

const SUBSCRIBED =
  "Абонирани сте за промоциите и известията ни за ново зареждане.";

function subscribedHtml(order: OrderEmailData) {
  return order.unsubscribeUrl
    ? [
        paragraph(
          `${escapeHtml(SUBSCRIBED)} ${link(order.unsubscribeUrl, "Отписване")}`,
        ),
      ]
    : [];
}

function subscribedText(order: OrderEmailData) {
  return order.unsubscribeUrl
    ? [`${SUBSCRIBED} Отписване: ${order.unsubscribeUrl}`]
    : [];
}

const SELLER_LINE = `Продавач: ${SELLER.name}, ${SELLER.address}, ЕИК ${SELLER.eik}, тел. ${OWNER_PHONE.display}, ${CONTACT_EMAIL}.`;

const WITHDRAWAL_TERMS = [
  WITHDRAWAL_RIGHT,
  "Отворен пакет не може да се върне: пакетите са вакуумирани по хигиенни причини.",
  RETURN_TERMS,
  REFUND_TERMS,
  CONFORMITY,
];

export function orderAcceptedEmail(order: OrderEmailData): EmailMessage {
  const greeting = `Здравейте! Приехме поръчка ${order.reference}.`;
  const payment = "Плащате при получаване.";

  return {
    subject: `Поръчка ${order.reference} е приета`,
    html: renderLayout({
      preheader: `${greeting} ${payment}`,
      heading: "Благодарим за поръчката!",
      bodyHtml: [
        paragraph(escapeHtml(greeting)),
        orderSummary(order),
        linesHtml(order),
        paragraph(`${escapeHtml(deliverySentence(order))} ${payment}`),
        ...WITHDRAWAL_TERMS.map((line) => paragraph(escapeHtml(line))),
        paragraph(
          `Формулярът за отказ е на ${link(`${SITE_URL}/withdraw`, `${SITE_URL}/withdraw`)}, а условията — на ${link(`${SITE_URL}/terms`, "страницата с общите условия")}.`,
        ),
        paragraph(escapeHtml(SELLER_LINE)),
        ...subscribedHtml(order),
      ].join("\n"),
    }),
    text: [
      "Благодарим за поръчката!",
      greeting,
      linesText(order),
      `${deliverySentence(order)} ${payment}`,
      ...WITHDRAWAL_TERMS,
      `Формулярът за отказ: ${SITE_URL}/withdraw. Общите условия: ${SITE_URL}/terms.`,
      SELLER_LINE,
      ...subscribedText(order),
      textFooter(),
    ].join("\n\n"),
  };
}

export function ownerNotificationEmail(order: OrderEmailData): EmailMessage {
  const delivery = order.office
    ? `До офис на Еконт: ${officeText(order.office)}`
    : `Доставка на ръка в гр. ${LOCAL_DELIVERY_CITY}`;
  const contact = `${order.contactName}, ${order.contactPhone}, ${order.email}`;

  return {
    subject: `Нова поръчка ${order.reference} — ${formatPrice(order.totalCents)}`,
    html: renderLayout({
      preheader: `${order.contactName} · ${formatPrice(order.totalCents)}`,
      heading: `Нова поръчка ${order.reference}`,
      toOwner: true,
      bodyHtml: [
        summaryHtml([
          ["Общо", formatPrice(order.totalCents)],
          ["Доставка", deliveryShort(order)],
        ]),
        paragraph(
          `${escapeHtml(order.contactName)}<br>${link(`tel:${order.contactPhone}`, order.contactPhone)}<br>${link(`mailto:${order.email}`, order.email)}`,
        ),
        linesHtml(order),
        paragraph(link(`${SITE_URL}/admin/orders`, "Отвори поръчките")),
      ].join("\n"),
    }),
    text: [
      `Нова поръчка ${order.reference}`,
      contact,
      delivery,
      linesText(order),
      `${SITE_URL}/admin/orders`,
    ].join("\n\n"),
  };
}

export function withdrawalReceivedEmail(
  withdrawal: WithdrawalEmailData,
): EmailMessage {
  const received = `Здравейте! Получихме отказа ви от договора по поръчка ${withdrawal.reference}, заявен на ${formatWithdrawalTime(withdrawal.withdrawnAt)}.`;
  const content = `Данни от поръчката: телефон ${withdrawal.contactPhone}, имейл ${withdrawal.email}.`;
  const next = !withdrawal.sent
    ? "Поръчката няма да бъде изпратена."
    : withdrawal.local
      ? "Ще ви се обадим, за да уговорим как да ни върнете стоката."
      : "Ще ви се обадим, за да уговорим връщането до офис на Еконт или Спиди в гр. Попово. Изпратете стоката обратно до 14 дни от отказа; изпращането е за ваша сметка.";

  return {
    subject: `Отказът от договора по поръчка ${withdrawal.reference} е получен`,
    html: renderLayout({
      preheader: next,
      heading: "Отказът е получен",
      bodyHtml: [
        paragraph(escapeHtml(received)),
        paragraph(escapeHtml(content)),
        paragraph(escapeHtml(next)),
      ].join("\n"),
    }),
    text: ["Отказът е получен", received, content, next, textFooter()].join(
      "\n\n",
    ),
  };
}

export function ownerWithdrawalEmail(
  withdrawal: WithdrawalEmailData & { withdrawalName: string | null },
): EmailMessage {
  const received = `Купувачът заяви отказ от поръчка ${withdrawal.reference} на ${formatWithdrawalTime(withdrawal.withdrawnAt)}.`;
  const next = withdrawal.sent
    ? "Поръчката вече е изпратена или предадена — уговорете връщането на стоката."
    : "Поръчката още не е изпратена — не я изпращайте.";
  const name = withdrawal.withdrawalName ? [withdrawal.withdrawalName] : [];

  return {
    subject: `Отказ от поръчка ${withdrawal.reference}`,
    html: renderLayout({
      preheader: next,
      heading: `Отказ от поръчка ${withdrawal.reference}`,
      toOwner: true,
      bodyHtml: [
        paragraph(escapeHtml(received)),
        paragraph(escapeHtml(next)),
        paragraph(
          [
            ...name.map(escapeHtml),
            link(`tel:${withdrawal.contactPhone}`, withdrawal.contactPhone),
            link(`mailto:${withdrawal.email}`, withdrawal.email),
          ].join("<br>"),
        ),
        paragraph(link(`${SITE_URL}/admin/orders`, "Отвори поръчките")),
      ].join("\n"),
    }),
    text: [
      `Отказ от поръчка ${withdrawal.reference}`,
      received,
      next,
      [...name, withdrawal.contactPhone, withdrawal.email].join(", "),
      `${SITE_URL}/admin/orders`,
    ].join("\n\n"),
  };
}

export function orderSentEmail(
  order: OrderEmailData & { office: { name: string; street: string } },
): EmailMessage {
  const sent = `Здравейте! Изпратихме поръчка ${order.reference} до офис на Еконт: ${officeText(order.office)}.`;
  const pay = `При получаване ще платите ${formatPrice(order.totalCents)}.`;

  return {
    subject: `Поръчка ${order.reference} е изпратена`,
    html: renderLayout({
      preheader: pay,
      heading: "Поръчката е изпратена",
      bodyHtml: [
        paragraph(escapeHtml(sent)),
        summaryHtml([
          ["Поръчка", order.reference],
          ["За плащане", formatPrice(order.totalCents)],
          ["Офис", officeText(order.office)],
        ]),
        paragraph(escapeHtml(pay)),
      ].join("\n"),
    }),
    text: ["Поръчката е изпратена", sent, pay, textFooter()].join("\n\n"),
  };
}

export function orderUpdatedEmail(order: OrderEmailData): EmailMessage {
  const updated = `Здравейте! Обновихме данните по поръчка ${order.reference}.`;
  const payment = "Плащате при получаване.";
  const phone = `Телефонът, на който ще ви търсим: ${order.contactPhone}.`;

  return {
    subject: `Поръчка ${order.reference} е обновена`,
    html: renderLayout({
      preheader: updated,
      heading: "Поръчката е обновена",
      bodyHtml: [
        paragraph(escapeHtml(updated)),
        orderSummary(order),
        linesHtml(order),
        paragraph(`${escapeHtml(deliverySentence(order))} ${payment}`),
        paragraph(escapeHtml(phone)),
        ...subscribedHtml(order),
      ].join("\n"),
    }),
    text: [
      "Поръчката е обновена",
      updated,
      linesText(order),
      `${deliverySentence(order)} ${payment}`,
      phone,
      ...subscribedText(order),
      textFooter(),
    ].join("\n\n"),
  };
}

export function orderCancelledEmail(
  order: OrderEmailData,
  withdrawn = false,
): EmailMessage {
  const cancelled = withdrawn
    ? `Здравейте! Поръчка ${order.reference} е анулирана след отказа ви и няма да бъде изпратена.`
    : `Здравейте! Поръчка ${order.reference} е анулирана, защото продуктът свърши, и няма да бъде изпратена.`;
  const contact = `За въпроси: ${OWNER_PHONE.display}.`;

  return {
    subject: `Поръчка ${order.reference} е анулирана`,
    html: renderLayout({
      preheader: cancelled,
      heading: "Поръчката е анулирана",
      bodyHtml: [
        paragraph(escapeHtml(cancelled)),
        paragraph(escapeHtml(contact)),
      ].join("\n"),
    }),
    text: ["Поръчката е анулирана", cancelled, contact, textFooter()].join(
      "\n\n",
    ),
  };
}
