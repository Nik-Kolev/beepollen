import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMPTY_CART,
  MAX_LINE_QUANTITY,
  addItem,
  collapseDuplicates,
  isPurchasable,
  parseCart,
  purchasableTotal,
  serializeCart,
  type Cart,
} from "@/lib/cart";

const POLLEN_500 = "Пчелен прашец 500 г";
const POLLEN_250 = "Пчелен прашец 250 г";

function cartOf(items: Cart["items"]): Cart {
  return { version: EMPTY_CART.version, items };
}

test("a line whose product is no longer in the catalogue is not purchasable", () => {
  assert.equal(isPurchasable({ quantity: 1, product: undefined }), false);
});

test("a line whose product is sold out is not purchasable", () => {
  assert.equal(
    isPurchasable({
      quantity: 1,
      product: { priceCents: 1200, stock: "NONE" },
    }),
    false,
  );
});

test("a line whose product is in stock is purchasable, low stock included", () => {
  assert.equal(
    isPurchasable({
      quantity: 1,
      product: { priceCents: 1200, stock: "PLENTY" },
    }),
    true,
  );
  assert.equal(
    isPurchasable({ quantity: 1, product: { priceCents: 1200, stock: "LOW" } }),
    true,
  );
});

test("the total sums price times quantity across purchasable lines", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 2, product: { priceCents: 1200, stock: "PLENTY" } },
      { quantity: 3, product: { priceCents: 700, stock: "LOW" } },
    ]),
    4500,
  );
});

test("the total leaves out a line whose product was withdrawn", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 2, product: { priceCents: 1200, stock: "PLENTY" } },
      { quantity: 5, product: undefined },
    ]),
    2400,
  );
});

test("the total leaves out a sold-out line even though it has a price", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 2, product: { priceCents: 1200, stock: "PLENTY" } },
      { quantity: 3, product: { priceCents: 500, stock: "NONE" } },
    ]),
    2400,
  );
});

test("the total is null when a purchasable line is unpriced", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 2, product: { priceCents: 1200, stock: "PLENTY" } },
      { quantity: 1, product: { priceCents: 0, stock: "LOW" } },
    ]),
    null,
  );
});

test("a withdrawn line does not make the total null", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 1, product: { priceCents: 900, stock: "PLENTY" } },
      { quantity: 1, product: undefined },
    ]),
    900,
  );
});

test("an unpriced sold-out line does not make the total null", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 1, product: { priceCents: 900, stock: "PLENTY" } },
      { quantity: 1, product: { priceCents: 0, stock: "NONE" } },
    ]),
    900,
  );
});

test("the total is zero when nothing in the cart is purchasable", () => {
  assert.equal(
    purchasableTotal([
      { quantity: 1, product: undefined },
      { quantity: 2, product: { priceCents: 1500, stock: "NONE" } },
    ]),
    0,
  );
  assert.equal(purchasableTotal([]), 0);
});

test("a valid cart survives being serialized and parsed again", () => {
  const cart = cartOf([
    { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 2 },
    { slug: "pchelen-prashets-250g", name: POLLEN_250, quantity: 1 },
  ]);

  assert.deepEqual(parseCart(serializeCart(cart)), cart);
});

test("nothing stored, or something that is not JSON, reads as the empty cart", () => {
  assert.deepEqual(parseCart(null), EMPTY_CART);
  assert.deepEqual(parseCart(""), EMPTY_CART);
  assert.deepEqual(parseCart("{not json"), EMPTY_CART);
});

test("a stored cart from version 1 is discarded", () => {
  const raw = JSON.stringify({
    version: 1,
    items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
  });

  assert.deepEqual(parseCart(raw), EMPTY_CART);
});

test("a stored version 2 cart whose items carry no name is discarded", () => {
  const raw = JSON.stringify({
    version: 2,
    items: [{ slug: "pchelen-prashets-500g", quantity: 2 }],
  });

  assert.deepEqual(parseCart(raw), EMPTY_CART);
});

test("a stored cart with an empty item name is discarded", () => {
  const raw = serializeCart(
    cartOf([{ slug: "pchelen-prashets-500g", name: "", quantity: 1 }]),
  );

  assert.deepEqual(parseCart(raw), EMPTY_CART);
});

test("a stored cart with an item name longer than 200 characters is discarded", () => {
  const raw = serializeCart(
    cartOf([
      { slug: "pchelen-prashets-500g", name: "а".repeat(201), quantity: 1 },
    ]),
  );

  assert.deepEqual(parseCart(raw), EMPTY_CART);
});

test("one invalid item discards the whole stored cart", () => {
  const raw = serializeCart(
    cartOf([
      { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 1 },
      { slug: "pchelen-prashets-250g", name: POLLEN_250, quantity: 0 },
    ]),
  );

  assert.deepEqual(parseCart(raw), EMPTY_CART);
});

test("a slug stored twice collapses into one line with the first name and the summed quantity", () => {
  const raw = serializeCart(
    cartOf([
      { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 2 },
      { slug: "pchelen-prashets-250g", name: POLLEN_250, quantity: 1 },
      { slug: "pchelen-prashets-500g", name: "Друго име", quantity: 3 },
    ]),
  );

  assert.deepEqual(
    parseCart(raw),
    cartOf([
      { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 5 },
      { slug: "pchelen-prashets-250g", name: POLLEN_250, quantity: 1 },
    ]),
  );
});

test("adding a product not yet in the cart appends a line with its name and a quantity of one", () => {
  const cart = addItem(EMPTY_CART, "pchelen-prashets-500g", POLLEN_500);

  assert.deepEqual(cart.items, [
    { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 1 },
  ]);
});

test("adding a product already in the cart keeps its original name and adds one", () => {
  const cart = addItem(
    cartOf([{ slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 2 }]),
    "pchelen-prashets-500g",
    "Ново име",
  );

  assert.deepEqual(cart.items, [
    { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 3 },
  ]);
});

test("adding a product already at the line limit leaves its quantity at 99", () => {
  const cart = addItem(
    cartOf([
      {
        slug: "pchelen-prashets-500g",
        name: POLLEN_500,
        quantity: MAX_LINE_QUANTITY,
      },
    ]),
    "pchelen-prashets-500g",
    POLLEN_500,
  );

  assert.equal(MAX_LINE_QUANTITY, 99);
  assert.equal(cart.items[0].quantity, 99);
});

test("adding a product with a name over 200 characters stores it shortened, so the cart still reads back", () => {
  const cart = addItem(EMPTY_CART, "pchelen-prashets-500g", "а".repeat(250));

  assert.equal(cart.items[0].name, "а".repeat(200));
  assert.deepEqual(parseCart(serializeCart(cart)), cart);
});

test("adding a product leaves the other lines untouched", () => {
  const cart = addItem(
    cartOf([
      { slug: "pchelen-prashets-500g", name: POLLEN_500, quantity: 2 },
      { slug: "pchelen-prashets-250g", name: POLLEN_250, quantity: 4 },
    ]),
    "pchelen-prashets-500g",
    POLLEN_500,
  );

  assert.deepEqual(cart.items[1], {
    slug: "pchelen-prashets-250g",
    name: POLLEN_250,
    quantity: 4,
  });
});

test("collapsing plain slug-and-quantity items sums each slug and caps it at 99", () => {
  const collapsed = collapseDuplicates([
    { slug: "pchelen-prashets-500g", quantity: 60 },
    { slug: "pchelen-prashets-250g", quantity: 3 },
    { slug: "pchelen-prashets-500g", quantity: 50 },
    { slug: "pchelen-prashets-250g", quantity: 4 },
  ]);

  assert.deepEqual(collapsed, [
    { slug: "pchelen-prashets-500g", quantity: 99 },
    { slug: "pchelen-prashets-250g", quantity: 7 },
  ]);
});
