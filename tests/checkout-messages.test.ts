import assert from "node:assert/strict";
import { test } from "node:test";

import {
  INCOMPLETE_ORDER,
  REFUSED,
  summaryError,
  UNAVAILABLE_LINES,
  UNKNOWN_OFFICE,
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
