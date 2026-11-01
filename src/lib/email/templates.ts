import { DISPATCH_NOTE, LOCAL_DELIVERY_CITY } from "@/lib/delivery";
import {
  EMAIL_COLOR,
  escapeHtml,
  renderLayout,
  textFooter,
} from "@/lib/email/layout";
import { formatPrice } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import { formatWithdrawalTime } from "@/lib/withdrawal-messages";

export type OrderEmailData = {
  reference: string;
  contactName: string;
  contactPhone: string;
  email: string;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  deliveryCents: number;
  totalCents: number;
  office: { name: string; street: string } | null;
  unsubscribeUrl?: string;
};

export type WithdrawalEmailData = {
  reference: string;
  withdrawnAt: Date;
  sent: boolean;
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
<tr>
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
    `Доставка: ${order.deliveryCents === 0 ? "Безплатна" : formatPrice(order.deliveryCents)}`,
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

export function orderAcceptedEmail(order: OrderEmailData): EmailMessage {
  const greeting = `Здравейте! Приехме поръчка ${order.reference}.`;
  const payment = "Плащате при получаване.";
  const withdrawal =
    "Имате право да се откажете от поръчката в срок от 14 дни от получаването ѝ.";
  const subscribed = "Абонирани сте за офертите и напомнянията ни по имейл.";

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
        paragraph(
          `${withdrawal} Формулярът за отказ е на ${link(`${SITE_URL}/withdraw`, `${SITE_URL}/withdraw`)}, а условията — на ${link(`${SITE_URL}/terms`, "страницата с общите условия")}.`,
        ),
        ...(order.unsubscribeUrl
          ? [
              paragraph(
                `${escapeHtml(subscribed)} ${link(order.unsubscribeUrl, "Отписване")}`,
              ),
            ]
          : []),
      ].join("\n"),
    }),
    text: [
      "Благодарим за поръчката!",
      greeting,
      linesText(order),
      `${deliverySentence(order)} ${payment}`,
      `${withdrawal} Формулярът за отказ: ${SITE_URL}/withdraw. Общите условия: ${SITE_URL}/terms.`,
      ...(order.unsubscribeUrl
        ? [`${subscribed} Отписване: ${order.unsubscribeUrl}`]
        : []),
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
  const received = `Здравейте! Получихме отказа ви от поръчка ${withdrawal.reference}, заявен на ${formatWithdrawalTime(withdrawal.withdrawnAt)}.`;
  const next = withdrawal.sent
    ? "Ще се свържем с вас, за да уговорим връщането на стоката."
    : "Поръчката няма да бъде изпратена.";

  return {
    subject: `Отказът от поръчка ${withdrawal.reference} е получен`,
    html: renderLayout({
      preheader: next,
      heading: "Отказът е получен",
      bodyHtml: [
        paragraph(escapeHtml(received)),
        paragraph(escapeHtml(next)),
      ].join("\n"),
    }),
    text: ["Отказът е получен", received, next, textFooter()].join("\n\n"),
  };
}

export function ownerWithdrawalEmail(
  withdrawal: WithdrawalEmailData & {
    withdrawalName: string | null;
    contactPhone: string;
    email: string;
  },
): EmailMessage {
  const received = `Купувачът заяви отказ от поръчка ${withdrawal.reference} на ${formatWithdrawalTime(withdrawal.withdrawnAt)}.`;
  const next = withdrawal.sent
    ? "Поръчката вече е изпратена — уговорете връщането на стоката."
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

export function subscriptionConfirmEmail(confirmation: {
  reference: string;
  confirmUrl: string;
}): EmailMessage {
  const asked = `Здравейте! При поръчка ${confirmation.reference} отбелязахте, че искате да получавате оферти и напомняния по имейл.`;
  const confirm = "Потвърдете абонамента от връзката по-долу.";
  const ignore =
    "Ако не сте го искали, не правете нищо — без потвърждение няма да ви пишем.";

  return {
    subject: "Потвърдете абонамента за офертите",
    html: renderLayout({
      preheader: confirm,
      heading: "Потвърдете абонамента",
      bodyHtml: [
        paragraph(escapeHtml(asked)),
        paragraph(
          `${escapeHtml(confirm)} ${link(confirmation.confirmUrl, "Потвърждавам абонамента")}`,
        ),
        paragraph(escapeHtml(ignore)),
      ].join("\n"),
    }),
    text: [
      "Потвърдете абонамента",
      asked,
      `${confirm} ${confirmation.confirmUrl}`,
      ignore,
      textFooter(),
    ].join("\n\n"),
  };
}

export function orderSentEmail(
  order: OrderEmailData & { office: { name: string; street: string } },
): EmailMessage {
  const sent = `Здравейте! Изпратихме поръчка ${order.reference} до офис на Еконт: ${officeText(order.office)}.`;
  const pay = `При получаване платете ${formatPrice(order.totalCents)}.`;

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
  const phone = `Телефон за връзка: ${order.contactPhone}.`;

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
      ].join("\n"),
    }),
    text: [
      "Поръчката е обновена",
      updated,
      linesText(order),
      `${deliverySentence(order)} ${payment}`,
      phone,
      textFooter(),
    ].join("\n\n"),
  };
}

export function orderCancelledEmail(order: OrderEmailData): EmailMessage {
  const cancelled = `Здравейте! Поръчка ${order.reference} е анулирана и няма да бъде изпратена.`;

  return {
    subject: `Поръчка ${order.reference} е анулирана`,
    html: renderLayout({
      preheader: cancelled,
      heading: "Поръчката е анулирана",
      bodyHtml: paragraph(escapeHtml(cancelled)),
    }),
    text: ["Поръчката е анулирана", cancelled, textFooter()].join("\n\n"),
  };
}
