import type { Page } from "@playwright/test";

import { CART_STORAGE_KEY } from "@/lib/cart";

// addInitScript runs before any page script; setting the key after load races
// hydration.
export async function seedCart(page: Page, value: unknown) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);

  await page.addInitScript(
    ({ key, stored }) => window.localStorage.setItem(key, stored),
    { key: CART_STORAGE_KEY, stored: raw },
  );
}
