import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test.use({ storageState: { cookies: [], origins: [] } });

function bar(page: Page) {
  return page.getByRole("region", { name: "Бисквитки", exact: true });
}

function settingsButton(page: Page) {
  return page
    .locator("footer")
    .getByRole("button", { name: "Бисквитки", exact: true });
}

function storedChoice(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), COOKIE_CONSENT_KEY);
}

async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return (
      main !== null &&
      Object.keys(main).some((key) => key.startsWith("__reactFiber"))
    );
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

test("a first visit shows the bar, and refusing hides it for good", async ({
  page,
}) => {
  await page.goto("/");

  await expect(bar(page)).toBeVisible();
  await expect(
    bar(page).getByRole("button", { name: "Приемам", exact: true }),
  ).toBeVisible();
  const reject = bar(page).getByRole("button", {
    name: "Отказвам",
    exact: true,
  });
  await expect(reject).toBeVisible();

  await reject.click();

  await expect(bar(page)).toBeHidden();
  expect(await storedChoice(page)).toBe("rejected");

  await page.reload();
  await waitForHydration(page);
  expect(await bar(page).count()).toBe(0);
});

test("accepting stores the choice and hides the bar", async ({ page }) => {
  await page.goto("/");

  await bar(page).getByRole("button", { name: "Приемам", exact: true }).click();

  await expect(bar(page)).toBeHidden();
  expect(await storedChoice(page)).toBe("accepted");
});

test("an unreadable stored value shows the bar again", async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "maybe"),
    COOKIE_CONSENT_KEY,
  );

  await page.goto("/");

  await expect(bar(page)).toBeVisible();
});

test("the footer button reopens the bar and gets focus back after a new choice", async ({
  page,
}) => {
  await page.goto("/");
  await bar(page)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();
  await expect(bar(page)).toBeHidden();

  await settingsButton(page).click();

  const accept = bar(page).getByRole("button", {
    name: "Приемам",
    exact: true,
  });
  await expect(bar(page)).toBeVisible();
  await expect(accept).toBeFocused();

  await accept.click();

  await expect(bar(page)).toBeHidden();
  await expect(settingsButton(page)).toBeFocused();
  expect(await storedChoice(page)).toBe("accepted");
});

test("a choice made in another tab hides this tab's bar", async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto("/");
  await expect(bar(first)).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await bar(second)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();

  await expect(bar(first)).toBeHidden();
  expect(await storedChoice(first)).toBe("rejected");
});

test("a choice made in another tab also closes a reopened bar", async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto("/");
  await bar(first)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();
  await settingsButton(first).click();
  await expect(bar(first)).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await settingsButton(second).click();
  await bar(second)
    .getByRole("button", { name: "Приемам", exact: true })
    .click();

  await expect(bar(first)).toBeHidden();
});

test("the bar still closes when the browser refuses storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("storage disabled");
    };
  });

  await page.goto("/");
  await bar(page)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();

  await expect(bar(page)).toBeHidden();
});

test("scrolled to the end, the footer's last row sits clear of the bar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(bar(page)).toBeVisible();

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );

  const button = await settingsButton(page).boundingBox();
  const banner = await bar(page).boundingBox();
  expect(button).not.toBeNull();
  expect(banner).not.toBeNull();
  expect(button!.y + button!.height).toBeLessThanOrEqual(banner!.y);
});

test("the bar's arrival moves nothing on a page shorter than the screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const shifted: string[] = [];
    Object.assign(window, { shifted });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        sources: { node: Node | null }[];
      }[]) {
        for (const source of entry.sources) {
          const node = source.node;
          if (node instanceof Element) shifted.push(node.tagName);
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/no-such-page");
  await expect(bar(page)).toBeVisible();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

  const shifted = await page.evaluate(
    () => (window as unknown as { shifted: string[] }).shifted,
  );
  expect(shifted).not.toContain("FOOTER");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    ),
  ).toBeGreaterThan(0);
});

test("the same hydration wait finds the bar on a shop page", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHydration(page);

  expect(await bar(page).count()).toBe(1);
});

test("a signed-in admin sees no bar on the order list", async ({
  page,
  context,
}) => {
  await signInAs(context, TEST_ADMIN_EMAIL);

  await page.goto("/admin/orders");
  await expect(
    page.getByRole("navigation", { name: "Филтър на поръчките" }),
  ).toBeVisible();
  await waitForHydration(page);

  expect(await bar(page).count()).toBe(0);
  expect(await storedChoice(page)).toBeNull();
});

test("the homepage with the bar showing has no accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(bar(page)).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations.map((v) => `${v.id} on ${v.nodes.length}: ${v.help}`),
  ).toEqual([]);
});
