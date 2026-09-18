import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  ["the homepage", "/"],
  ["a product page", "/products/pchelen-prashets-500g"],
] as const;

for (const [name, path] of PAGES) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
    ).toEqual([]);
  });
}
