import assert from "node:assert/strict";
import { test } from "node:test";

import { pricePerKiloCents } from "@/lib/money";

test("the price per kilogram is scaled from the net weight and rounded to a cent", () => {
  assert.equal(pricePerKiloCents(2450, 500), 4900);
  assert.equal(pricePerKiloCents(999, 250), 3996);
  assert.equal(pricePerKiloCents(1000, 300), 3333);
});

test("no price per kilogram for the kilogram pack, an unknown weight or a missing price", () => {
  assert.equal(pricePerKiloCents(4590, 1000), null);
  assert.equal(pricePerKiloCents(2450, null), null);
  assert.equal(pricePerKiloCents(2450, 0), null);
  assert.equal(pricePerKiloCents(0, 500), null);
});
