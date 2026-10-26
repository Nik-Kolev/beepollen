import { expect, test } from "@playwright/test";

import { SITE_URL } from "@/lib/site";

test("robots.txt keeps crawlers out of the admin only, and names the sitemap", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");
  const body = await response.text();

  expect(response.status()).toBe(200);
  const disallowed = [...body.matchAll(/^Disallow: (.*)$/gm)].map(
    ([, path]) => path,
  );
  expect(disallowed).toEqual(["/admin"]);
  expect(body).toMatch(/^Allow: \/$/m);
  expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("the cart and the checkout, open to crawlers, tell them not to index the page", async ({
  page,
}) => {
  for (const path of ["/cart", "/checkout"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute(
      "content",
      "noindex, follow",
    );
  }
});

test("the sitemap lists the home page, every published product and the legal pages, and nothing else", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  const body = await response.text();
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

  expect(response.status()).toBe(200);
  expect(urls.sort()).toEqual(
    [
      "/",
      "/cookies",
      "/privacy",
      "/products/pchelen-prashets-1kg",
      "/products/pchelen-prashets-500g",
      "/terms",
    ]
      .map((path) => new URL(path, SITE_URL).href)
      .sort(),
  );
});

test("the home page names itself as canonical", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    SITE_URL,
  );
});

test("the home page describes the shop with verified facts only", async ({
  page,
}) => {
  await page.goto("/");

  const raw = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const shop = JSON.parse(raw ?? "");

  expect(shop).toMatchObject({
    "@type": "OnlineStore",
    name: "Пчелни продукти Д & Н Димитрови",
    telephone: "+359893868656",
    address: { addressLocality: "Попово", addressCountry: "BG" },
  });
  expect(raw).not.toContain("TODO");
});
