const CART = {
  version: 1,
  items: [{ slug: "pchelen-prashets-500g", quantity: 1 }],
};

module.exports = async (browser, { url }) => {
  const target = new URL(url);
  const page = await browser.newPage();

  await page.goto(target.origin);
  await page.evaluate(
    (cart) => {
      if (cart) localStorage.setItem("beepollen.cart", cart);
      else localStorage.removeItem("beepollen.cart");
    },
    target.pathname === "/checkout" ? JSON.stringify(CART) : null,
  );

  if (target.pathname === "/checkout") {
    await page.goto(url);
    await page.waitForSelector('input[name="email"]', { timeout: 10_000 });
  }

  await page.close();
};
