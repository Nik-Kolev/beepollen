import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type CampaignProductData,
  promotionEmail,
  restockEmail,
} from "@/lib/email/campaign-templates";
import { PREVIEWS } from "@/lib/email/previews";
import { SITE_URL } from "@/lib/site";

const UNSUBSCRIBE = `${SITE_URL}/subscription/unsubscribe?token=abc`;

const PRODUCT: CampaignProductData = {
  slug: "pchelen-prashets-500g",
  name: "Пчелен прашец 500 г",
  image: { path: "/products/pollen-500g-bag.jpg", alt: "Пакет прашец" },
  priceCents: 1200,
  regularPriceCents: null,
};

const OTHER: CampaignProductData = {
  ...PRODUCT,
  slug: "pchelen-prashets-1kg",
  name: "Пчелен прашец 1 кг",
  image: null,
  priceCents: 2200,
};

const promotion = () =>
  promotionEmail({
    text: "Само сега!\n\n<b>Побързайте</b> & вземете",
    product: { ...PRODUCT, priceCents: 960, regularPriceCents: 1200 },
    startsOn: "2026-11-16",
    endsOn: "2026-11-22",
    unsubscribeUrl: UNSUBSCRIBE,
  });

test("the promotion email shows the photo, the struck regular price, the promotion price and its days", () => {
  const { subject, html, text } = promotion();

  assert.equal(subject, "Промоция: Пчелен прашец 500 г");
  assert.match(
    html,
    new RegExp(
      `src="${SITE_URL}/products/pollen-500g-bag.jpg"[^>]*alt="Пакет прашец"`,
    ),
  );
  assert.match(html, /<s [^>]*>12,00\s€<\/s>/);
  assert.match(html, /9,60\s€/);
  assert.match(html, /От 16\.11\.2026 до 22\.11\.2026 включително\./);
  assert.match(
    text,
    /9,60\s€ вместо 12,00\s€\. От 16\.11\.2026 до 22\.11\.2026/,
  );
});

test("the owner's text comes before the button, escaped and split into paragraphs", () => {
  const { html, text } = promotion();

  assert.ok(html.includes('<p style="margin:0 0 16px;">Само сега!</p>'));
  assert.ok(html.includes("&lt;b&gt;Побързайте&lt;/b&gt; &amp; вземете"));
  assert.ok(!html.includes("<b>Побързайте"));
  const owner = html.indexOf("Само сега!");
  const button = html.lastIndexOf(
    `href="${SITE_URL}/products/pchelen-prashets-500g"`,
  );
  assert.ok(owner > 0 && button > owner);
  assert.ok(text.includes("Само сега!\n\n<b>Побързайте</b> & вземете"));
  assert.ok(
    text.includes(`Към продукта: ${SITE_URL}/products/pchelen-prashets-500g`),
  );
});

test("every campaign email carries the unsubscribe link in both parts", () => {
  const messages = [
    promotion(),
    restockEmail({
      text: "Ново",
      products: [PRODUCT],
      unsubscribeUrl: UNSUBSCRIBE,
    }),
  ];

  for (const { html, text } of messages) {
    assert.ok(html.includes(`href="${UNSUBSCRIBE}"`));
    assert.ok(text.includes(`Отписване: ${UNSUBSCRIBE}`));
  }
});

test("the restock email shows each product as a card with its price and link, and a promotion price struck", () => {
  const discounted = { ...OTHER, priceCents: 1800, regularPriceCents: 2200 };
  const { subject, html, text } = restockEmail({
    text: "Ново зареждане",
    products: [PRODUCT, discounted],
    unsubscribeUrl: UNSUBSCRIBE,
  });

  assert.equal(
    subject,
    "Ново зареждане: Пчелен прашец 500 г, Пчелен прашец 1 кг",
  );
  for (const product of [PRODUCT, discounted]) {
    assert.ok(html.includes(`href="${SITE_URL}/products/${product.slug}"`));
    assert.ok(html.includes(product.name));
  }
  assert.match(html, /12,00\s€/);
  assert.match(html, /<s [^>]*>22,00\s€<\/s>/);
  assert.match(
    html,
    new RegExp(
      `<img src="${SITE_URL}/products/pollen-500g-bag.jpg" width="200"`,
    ),
  );
  assert.equal(html.match(/<img src="[^"]*\/products\//g)?.length, 1);
  assert.equal(html.match(/>Към продукта<\/a>/g)?.length, 2);
  assert.match(text, /Пчелен прашец 1 кг — 18,00\s€ вместо 22,00\s€: /);
});

test("a restock email without products links to the shop", () => {
  const { subject, html, text } = restockEmail({
    text: "Имаме ново зареждане.",
    products: [],
    unsubscribeUrl: UNSUBSCRIBE,
  });
  assert.equal(subject, "Ново зареждане");
  assert.match(html, new RegExp(`href="${SITE_URL}"[^>]*>Към магазина</a>`));
  assert.ok(text.includes(`Към магазина: ${SITE_URL}`));
});

test("the previews include the promotion email and one restock email", () => {
  const titles = PREVIEWS.map(({ title }) => title);
  assert.ok(titles.some((title) => title.startsWith("Промоция")));
  assert.equal(
    titles.filter((title) => title.startsWith("Ново зареждане")).length,
    1,
  );
  for (const preview of PREVIEWS) assert.ok(preview.render().html);
});

test("the promotion email keeps the order: photo, name, prices, days, owner's text, button", () => {
  const { html } = promotion();
  const body = html.slice(html.indexOf("<h1"));
  const positions = [
    body.indexOf(`<img src="${SITE_URL}/products/`),
    body.indexOf(">Пчелен прашец 500 г</p>"),
    body.indexOf("<s "),
    body.search(/9,60\s€/),
    body.indexOf("От 16.11.2026"),
    body.indexOf("Само сега!"),
    body.lastIndexOf(`href="${SITE_URL}/products/pchelen-prashets-500g"`),
  ];

  assert.ok(
    positions.every((position) => position > 0),
    String(positions),
  );
  assert.deepEqual(
    positions,
    positions.toSorted((a, b) => a - b),
  );
});

test("a product's name and photo description are escaped in every campaign email", () => {
  const crafted: CampaignProductData = {
    ...PRODUCT,
    name: '<b>"x"&</b>',
    image: { path: "/products/pollen-500g-bag.jpg", alt: 'a" onerror="x' },
  };
  const messages = [
    promotionEmail({
      text: "Текст",
      product: { ...crafted, priceCents: 960, regularPriceCents: 1200 },
      startsOn: "2026-11-16",
      endsOn: "2026-11-22",
      unsubscribeUrl: UNSUBSCRIBE,
    }),
    restockEmail({
      text: "Текст",
      products: [crafted],
      unsubscribeUrl: UNSUBSCRIBE,
    }),
  ];

  for (const { html } of messages) {
    assert.ok(!html.includes("<b>"));
    assert.ok(!html.includes('alt="a" onerror'));
    assert.ok(html.includes("&lt;b&gt;&quot;x&quot;&amp;&lt;/b&gt;"));
    assert.ok(html.includes('alt="a&quot; onerror=&quot;x"'));
  }
});

test("line breaks typed in a browser split the owner's text the same way in both parts", () => {
  const { html, text } = restockEmail({
    text: "Първи ред\r\nвтори ред\r\n\r\n \r\n\r\nНов абзац",
    products: [],
    unsubscribeUrl: UNSUBSCRIBE,
  });

  assert.ok(html.includes(">Първи ред<br>втори ред</p>"));
  assert.ok(html.includes(">Нов абзац</p>"));
  assert.ok(text.includes("Първи ред\nвтори ред\n\nНов абзац"));
  assert.ok(!text.includes("\r"));
});
