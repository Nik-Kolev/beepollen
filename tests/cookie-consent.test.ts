import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCookieChoice } from "@/lib/cookie-consent";

test("reads back the two choices the bar can store", () => {
  assert.equal(parseCookieChoice("accepted"), "accepted");
  assert.equal(parseCookieChoice("rejected"), "rejected");
});

test("treats a missing value as no choice", () => {
  assert.equal(parseCookieChoice(null), null);
  assert.equal(parseCookieChoice(""), null);
});

test("treats anything other than the exact two values as no choice", () => {
  for (const raw of [
    "ACCEPTED",
    "Rejected",
    " accepted",
    "accepted ",
    "yes",
    "true",
    '"accepted"',
    '{"choice":"accepted"}',
    "[]",
  ]) {
    assert.equal(parseCookieChoice(raw), null, raw);
  }
});
