import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

import { TEST_ADMIN_EMAIL } from "./admin-env";
import { signInAs } from "./admin-session";

test.use({ storageState: { cookies: [], origins: [] } });

function bar(page: Page) {
  return page.getByRole("region", { name: "Бисквитки", exact: true });
}

function footerLink(page: Page) {
  return page
    .locator("footer")
    .getByRole("link", { name: "Бисквитки", exact: true });
}

function pageChoice(page: Page, name: "Приемам" | "Отказвам") {
  return page.getByRole("main").getByRole("button", { name, exact: true });
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

test("the footer link leads to the cookie page, where a refusal can be changed", async ({
  page,
}) => {
  await page.goto("/");
  await bar(page)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();
  await expect(bar(page)).toBeHidden();

  await footerLink(page).click();

  await expect(page).toHaveURL("/cookies");
  await expect(
    page.getByText("Отказали сте бисквитките на Google Analytics."),
  ).toBeVisible();
  await expect(pageChoice(page, "Отказвам")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await pageChoice(page, "Приемам").click();

  await expect(
    page.getByText("Приели сте бисквитките на Google Analytics."),
  ).toBeVisible();
  await expect(pageChoice(page, "Приемам")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(pageChoice(page, "Отказвам")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(await storedChoice(page)).toBe("accepted");
  expect(await bar(page).count()).toBe(0);
});

test("the bar links to the cookie page, and a choice made there closes the bar", async ({
  page,
}) => {
  await page.goto("/");
  await bar(page)
    .getByRole("link", { name: "Политика за бисквитките", exact: true })
    .click();

  await expect(page).toHaveURL("/cookies");
  await expect(page.getByText("Още не сте избрали.")).toBeVisible();
  await expect(bar(page)).toBeVisible();

  await pageChoice(page, "Отказвам").click();

  await expect(bar(page)).toBeHidden();
  expect(await storedChoice(page)).toBe("rejected");
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

  const button = await footerLink(page).boundingBox();
  const banner = await bar(page).boundingBox();
  expect(button).not.toBeNull();
  expect(banner).not.toBeNull();
  expect(button!.y + button!.height).toBeLessThanOrEqual(banner!.y);
});

test("on a wide screen the bar is a card as wide as the catalogue, and the strip around it lets clicks through", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the card layout starts at the sm breakpoint");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(bar(page)).toBeVisible();

  const cardLocator = bar(page).locator("p").locator("..");
  const transparent = "rgba(0, 0, 0, 0)";
  expect(
    await bar(page).evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(transparent);
  expect(
    await cardLocator.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(transparent);

  const card = await cardLocator.boundingBox();
  const grid = await page.locator("main ul").first().boundingBox();
  const region = await bar(page).boundingBox();
  expect(card).not.toBeNull();
  expect(grid).not.toBeNull();
  expect(region).not.toBeNull();
  expect(Math.round(card!.x)).toBe(Math.round(grid!.x));
  expect(Math.round(card!.width)).toBe(Math.round(grid!.width));

  const below = {
    x: card!.x + 40,
    y: (card!.y + card!.height + region!.y + region!.height) / 2,
  };
  const beside = {
    x: (region!.x + card!.x) / 2,
    y: card!.y + card!.height / 2,
  };
  const hits = await page.evaluate(
    (points) =>
      points.map(({ x, y }) =>
        Boolean(
          document
            .elementFromPoint(x, y)
            ?.closest("section[aria-label='Бисквитки']"),
        ),
      ),
    [below, beside],
  );
  expect(hits).toEqual([false, false]);
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

function countAnalyticsRequests(page: Page) {
  const requests: string[] = [];
  return page
    .route("**/www.googletagmanager.com/**", (route) => {
      requests.push(route.request().url());
      return route.abort();
    })
    .then(() => requests);
}

test("Google Analytics loads only after the visitor accepts", async ({
  page,
}) => {
  const requests = await countAnalyticsRequests(page);
  await page.goto("/");
  await waitForHydration(page);
  await page.waitForLoadState("networkidle");

  expect(requests).toEqual([]);

  await bar(page).getByRole("button", { name: "Приемам", exact: true }).click();

  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(requests[0]).toContain("id=G-E2ETEST000");
});

test("a visitor who refused never loads Google Analytics", async ({ page }) => {
  const requests = await countAnalyticsRequests(page);
  await page.goto("/");
  await bar(page)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();
  await page.reload();
  await waitForHydration(page);
  await page.waitForLoadState("networkidle");

  await expect(bar(page)).toBeHidden();
  expect(requests).toEqual([]);
});

test("refusing after accepting switches off the tag already in the page, and accepting again switches it back on", async ({
  page,
}) => {
  await countAnalyticsRequests(page);
  await page.goto("/cookies");
  await waitForHydration(page);

  const disabled = () =>
    page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>)[
          "ga-disable-G-E2ETEST000"
        ],
    );
  const lastConsent = () =>
    page.evaluate(() => {
      const layer = (window as unknown as { dataLayer?: IArguments[] })
        .dataLayer;
      const updates = (layer ?? [])
        .map((entry) => Array.from(entry))
        .filter(([kind, action]) => kind === "consent" && action === "update");
      return updates.at(-1)?.[2] ?? null;
    });

  await pageChoice(page, "Приемам").click();
  await expect.poll(disabled).toBe(false);

  await pageChoice(page, "Отказвам").click();
  await expect.poll(disabled).toBe(true);
  await expect.poll(lastConsent).toEqual({ analytics_storage: "denied" });

  await pageChoice(page, "Приемам").click();
  await expect.poll(disabled).toBe(false);
  await expect.poll(lastConsent).toEqual({ analytics_storage: "granted" });
});

test("refusing deletes the Google Analytics cookies and nothing else", async ({
  page,
  context,
}) => {
  await countAnalyticsRequests(page);
  await context.addCookies(
    ["_ga", "_ga_E2ETEST000", "keep"].map((name) => ({
      name,
      value: "1",
      domain: "localhost",
      path: "/",
    })),
  );
  await page.goto("/");

  await bar(page)
    .getByRole("button", { name: "Отказвам", exact: true })
    .click();

  await expect
    .poll(async () => (await context.cookies()).map(({ name }) => name).sort())
    .toEqual(["keep"]);
});

test("a returning visitor who refused has stray Google Analytics cookies deleted on load", async ({
  page,
  context,
}) => {
  await countAnalyticsRequests(page);
  await page.addInitScript(
    (key) => localStorage.setItem(key, "rejected"),
    COOKIE_CONSENT_KEY,
  );
  await context.addCookies([
    { name: "_ga", value: "1", domain: "localhost", path: "/" },
  ]);
  await page.goto("/");

  await expect
    .poll(async () => (await context.cookies()).map(({ name }) => name))
    .toEqual([]);
});
