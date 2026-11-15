import {
  EMAIL_COLOR,
  escapeHtml,
  renderLayout,
  textFooter,
} from "@/lib/email/layout";
import type { EmailMessage } from "@/lib/email/templates";
import { formatPrice } from "@/lib/money";
import { SITE_URL } from "@/lib/site";

export type CampaignProductData = {
  slug: string;
  name: string;
  image: { path: string; alt: string } | null;
  priceCents: number;
  regularPriceCents: number | null;
};

export type PromotionEmailData = {
  text: string;
  product: CampaignProductData & { regularPriceCents: number };
  startsOn: string;
  endsOn: string;
  unsubscribeUrl: string;
};

export type RestockEmailData = {
  text: string;
  products: CampaignProductData[];
  unsubscribeUrl: string;
};

export type RestockVariant = "list" | "cards";

const SUBSCRIBED =
  "Получавате този имейл, защото сте абонирани за офертите ни.";

function formatDay(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

function productUrl(product: CampaignProductData) {
  return `${SITE_URL}/products/${product.slug}`;
}

function ownerBlocks(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim());
}

function ownerTextHtml(text: string) {
  return ownerBlocks(text)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");
}

function ownerText(text: string) {
  return ownerBlocks(text).join("\n\n");
}

function photo(product: CampaignProductData, width: number) {
  if (!product.image) return "";
  return `<a href="${escapeHtml(productUrl(product))}"><img src="${escapeHtml(`${SITE_URL}${product.image.path}`)}" width="${width}" alt="${escapeHtml(product.image.alt)}" style="display:block;border:0;border-radius:8px;width:${width}px;max-width:100%;height:auto;"></a>`;
}

function priceHtml(product: CampaignProductData, size: number) {
  const struck = product.regularPriceCents
    ? `<s style="color:${EMAIL_COLOR.inkSoft};font-weight:normal;font-size:${size - 4}px;">${formatPrice(product.regularPriceCents)}</s> `
    : "";
  return `${struck}<span style="font-weight:bold;font-size:${size}px;color:${product.regularPriceCents ? EMAIL_COLOR.action : EMAIL_COLOR.ink};">${formatPrice(product.priceCents)}</span>`;
}

function priceText(product: CampaignProductData) {
  return product.regularPriceCents
    ? `${formatPrice(product.priceCents)} вместо ${formatPrice(product.regularPriceCents)}`
    : formatPrice(product.priceCents);
}

function button(href: string, label: string, fullWidth = false) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${fullWidth ? ' width="100%"' : ""}>
<tr><td align="center" style="background:${EMAIL_COLOR.action};border-radius:6px;">
<a href="${escapeHtml(href)}" style="display:block;padding:12px 20px;font-weight:bold;font-size:16px;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
</td></tr>
</table>`;
}

function subscribedHtml(unsubscribeUrl: string) {
  return `<p style="margin:24px 0 0;font-size:13px;color:${EMAIL_COLOR.inkSoft};">${escapeHtml(SUBSCRIBED)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:${EMAIL_COLOR.inkSoft};">Отписване</a></p>`;
}

function subscribedText(unsubscribeUrl: string) {
  return `${SUBSCRIBED} Отписване: ${unsubscribeUrl}`;
}

export function promotionSubject(productName: string) {
  return `Промоция: ${productName}`;
}

export function restockSubject(productNames: string[]) {
  return productNames.length > 0
    ? `Ново зареждане: ${productNames.join(", ")}`
    : "Ново зареждане";
}

export function promotionEmail(data: PromotionEmailData): EmailMessage {
  const { product } = data;
  const dates = `От ${formatDay(data.startsOn)} до ${formatDay(data.endsOn)} включително.`;

  return {
    subject: promotionSubject(product.name),
    html: renderLayout({
      preheader: `${product.name} за ${formatPrice(product.priceCents)} вместо ${formatPrice(product.regularPriceCents)}. ${dates}`,
      heading: `${product.name} на промоция`,
      bodyHtml: [
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:${EMAIL_COLOR.ground};border-radius:8px;">
<tr><td align="center" style="padding:20px 16px;">
${photo(product, 240)}
<p style="margin:16px 0 4px;font-size:18px;font-weight:bold;">${escapeHtml(product.name)}</p>
<p style="margin:0 0 4px;">${priceHtml(product, 24)}</p>
<p style="margin:0;color:${EMAIL_COLOR.inkSoft};">${escapeHtml(dates)}</p>
</td></tr>
</table>`,
        ownerTextHtml(data.text),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${button(productUrl(product), "Към продукта")}</td></tr></table>`,
        subscribedHtml(data.unsubscribeUrl),
      ].join("\n"),
    }),
    text: [
      `${product.name} на промоция`,
      `${priceText(product)}. ${dates}`,
      ownerText(data.text),
      `Към продукта: ${productUrl(product)}`,
      subscribedText(data.unsubscribeUrl),
      textFooter(),
    ].join("\n\n"),
  };
}

function listRow(product: CampaignProductData) {
  return `<tr>
<td width="96" style="padding:12px 16px 12px 0;vertical-align:top;border-top:1px solid ${EMAIL_COLOR.line};">${photo(product, 96)}</td>
<td style="padding:12px 0;vertical-align:top;border-top:1px solid ${EMAIL_COLOR.line};">
<p style="margin:0 0 4px;font-weight:bold;">${escapeHtml(product.name)}</p>
<p style="margin:0 0 12px;">${priceHtml(product, 18)}</p>
${button(productUrl(product), "Виж продукта")}
</td>
</tr>`;
}

function card(product: CampaignProductData) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${EMAIL_COLOR.ground};border-radius:8px;">
<tr><td align="center" style="padding:20px 16px;">
${photo(product, 200)}
<p style="margin:16px 0 4px;font-size:18px;font-weight:bold;">${escapeHtml(product.name)}</p>
<p style="margin:0 0 16px;">${priceHtml(product, 20)}</p>
${button(productUrl(product), "Към продукта", true)}
</td></tr>
</table>`;
}

function restockProductsHtml(
  products: CampaignProductData[],
  variant: RestockVariant,
) {
  if (products.length === 0) return button(SITE_URL, "Към магазина");
  return variant === "list"
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
${products.map(listRow).join("\n")}
</table>`
    : products.map(card).join("\n");
}

export function restockEmail(
  data: RestockEmailData,
  variant: RestockVariant,
): EmailMessage {
  const heading = "Ново зареждане";
  const names = data.products.map(({ name }) => name).join(", ");

  return {
    subject: restockSubject(data.products.map(({ name }) => name)),
    html: renderLayout({
      preheader: names
        ? `Отново в наличност: ${names}.`
        : "Имаме ново зареждане.",
      heading,
      bodyHtml: [
        ownerTextHtml(data.text),
        restockProductsHtml(data.products, variant),
        subscribedHtml(data.unsubscribeUrl),
      ].join("\n"),
    }),
    text: [
      heading,
      ownerText(data.text),
      ...(data.products.length > 0
        ? data.products.map(
            (product) =>
              `${product.name} — ${priceText(product)}: ${productUrl(product)}`,
          )
        : [`Към магазина: ${SITE_URL}`]),
      subscribedText(data.unsubscribeUrl),
      textFooter(),
    ].join("\n\n"),
  };
}
