const CART = {
  version: 2,
  items: [
    { slug: "pchelen-prashets-500g", name: "Пчелен прашец 500 г", quantity: 1 },
  ],
};

module.exports = async (browser, { url }) => {
  const target = new URL(url);
  const page = await browser.newPage();

  await page.goto(target.origin);
  await page.evaluate(
    (cart) => {
      localStorage.setItem("beepollen.cookie-consent", "rejected");
      if (cart) localStorage.setItem("beepollen.cart", cart);
      else localStorage.removeItem("beepollen.cart");
    },
    target.pathname === "/checkout" ? JSON.stringify(CART) : null,
  );

  if (target.pathname === "/checkout") {
    await page.goto(url);
    await page.waitForSelector('input[name="email"]:enabled', {
      timeout: 10_000,
    });
  }

  await page.close();
};
