import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blockedReason,
  INCOMPLETE_ORDER,
  MISSING_PRICE,
  REFUSED,
  SOLD_OUT_LINES,
  summaryError,
  UNAVAILABLE_LINES,
  UNKNOWN_OFFICE,
  WITHDRAWN_LINES,
} from "@/lib/checkout-messages";
import type { PlaceOrderResult } from "@/lib/orders";

const NO_OFFICE = { ok: false, code: "UNKNOWN_OFFICE" } as const;

test("a successful order and a form that has not been submitted say nothing", () => {
  assert.equal(summaryError(null, false, false), null);
  assert.equal(
    summaryError(
      {
        ok: true,
        repeated: false,
        order: {
          id: 1,
          reference: "BP24091",
          itemsCents: 1,
          deliveryCents: 0,
          totalCents: 1,
        },
      },
      false,
      false,
    ),
    null,
  );
});

test("a refused order says nothing about which check caught it", () => {
  assert.equal(
    summaryError({ ok: false, code: "REJECTED" }, false, false),
    REFUSED,
  );
});

test("a withdrawn office is reported until another one is chosen", () => {
  assert.equal(summaryError(NO_OFFICE, false, false), UNKNOWN_OFFICE);
  assert.equal(summaryError(NO_OFFICE, false, true), null);
});

test("unavailable lines are reported only while they are still in the cart", () => {
  const result: PlaceOrderResult = {
    ok: false,
    code: "UNAVAILABLE_ITEMS",
    slugs: ["pchelen-prashets-500g"],
  };

  assert.equal(summaryError(result, true, false), UNAVAILABLE_LINES);
  assert.equal(summaryError(result, false, false), null);
});

test("a field the form can mark is left to the field, and one it cannot is not", () => {
  assert.equal(
    summaryError(
      { ok: false, code: "VALIDATION_ERROR", fields: ["email", "officeCode"] },
      false,
      false,
    ),
    null,
  );
  assert.equal(
    summaryError(
      { ok: false, code: "VALIDATION_ERROR", fields: ["email", "items"] },
      false,
      false,
    ),
    INCOMPLETE_ORDER,
  );
});

const IN_STOCK = { product: { priceCents: 2450, stock: "PLENTY" as const } };
const SOLD_OUT = { product: { priceCents: 2450, stock: "NONE" as const } };
const UNPRICED = { product: { priceCents: 0, stock: "PLENTY" as const } };
const WITHDRAWN = {};

test("a basket of priced, in-stock lines is not blocked", () => {
  assert.equal(blockedReason([IN_STOCK, IN_STOCK]), null);
});

test("a line running low is still orderable", () => {
  assert.equal(
    blockedReason([{ product: { priceCents: 2450, stock: "LOW" } }]),
    null,
  );
});

test("a sold-out line blocks the order and says so", () => {
  assert.equal(blockedReason([IN_STOCK, SOLD_OUT]), SOLD_OUT_LINES);
});

test("a withdrawn line is named before a sold-out one", () => {
  assert.equal(blockedReason([SOLD_OUT, WITHDRAWN]), WITHDRAWN_LINES);
});

test("a sold-out line is named before a missing price", () => {
  assert.equal(blockedReason([UNPRICED, SOLD_OUT]), SOLD_OUT_LINES);
});

test("an unpriced line blocks the order", () => {
  assert.equal(blockedReason([IN_STOCK, UNPRICED]), MISSING_PRICE);
});
