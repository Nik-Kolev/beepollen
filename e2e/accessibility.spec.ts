import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { seedCart } from "./seed-cart";

const PAGES = [
  ["the homepage", "/"],
  ["a product page", "/products/pchelen-prashets-500g"],
  ["the cart page", "/cart"],
  ["the checkout page", "/checkout"],
  ["the office picker", "/delivery-test"],
  ["the not-found page", "/no-such-page"],
  ["an unknown product slug", "/products/no-such-product"],
] as const;

for (const [name, path] of PAGES) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    if (path === "/cart" || path === "/checkout") {
      await seedCart(page, {
        version: 1,
        items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
      });
    }

    await page.goto(path);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
    ).toEqual([]);
  });
}

// Chromium keeps the implicit list role after Preflight removes the marker, so
// axe cannot see a missing one; this guards the markup, not the announcement.
const LIST_PAGES = ["/", "/products/pchelen-prashets-500g"] as const;

for (const path of LIST_PAGES) {
  test(`every list on ${path} declares its role`, async ({ page }) => {
    await page.goto(path);

    expect(await page.locator("ul:not([role]), ol:not([role])").count()).toBe(
      0,
    );
  });
}
