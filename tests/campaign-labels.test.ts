import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countWord,
  promotionSampleText,
  restockSampleText,
} from "@/lib/campaign-labels";

test("the promotion sample names the product and the last day", () => {
  assert.equal(
    promotionSampleText("Пчелен прашец 500 г", "2026-11-22"),
    "Пчелен прашец 500 г е на промоция. Важи до изчерпване на количествата или до 22.11.2026.",
  );
});

test("the restock sample names the chosen products, or pollen when none is chosen", () => {
  assert.equal(
    restockSampleText([]),
    "Ново зареждане на пчелен прашец. Възползвайте се!",
  );
  assert.equal(
    restockSampleText(["Пчелен прашец 1 кг"]),
    "Ново зареждане на Пчелен прашец 1 кг. Възползвайте се!",
  );
  assert.equal(
    restockSampleText(["А", "Б", "В"]),
    "Ново зареждане на А, Б и В. Възползвайте се!",
  );
});

test("a count of one takes the singular", () => {
  assert.equal(countWord(1, "абонат", "абонати"), "1 абонат");
  assert.equal(countWord(2, "абонат", "абонати"), "2 абонати");
  assert.equal(countWord(0, "абонат", "абонати"), "0 абонати");
});
