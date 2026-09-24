import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutPayload } from "@/lib/checkout-payload";
import { placeOrder } from "@/lib/orders";

function formDataWith(entries: [string, FormDataEntryValue][]) {
  const formData = new FormData();

  for (const [name, value] of entries) formData.append(name, value);

  return formData;
}

const VALID_UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("a missing field reads as an empty string rather than null", () => {
  const payload = checkoutPayload(new FormData());

  assert.deepEqual(payload, {
    name: "",
    email: "",
    phone: "",
    items: [],
    officeCode: "",
    acceptsTerms: false,
    acceptsOffers: false,
    idempotencyKey: "",
    website: "",
  });
});

test("an unchecked box is false and a checked one is true", () => {
  const payload = checkoutPayload(
    formDataWith([
      ["acceptsTerms", "on"],
      ["acceptsOffers", "on"],
    ]),
  );

  assert.equal(payload.acceptsTerms, true);
  assert.equal(payload.acceptsOffers, true);

  const unchecked = checkoutPayload(new FormData());

  assert.equal(unchecked.acceptsTerms, false);
  assert.equal(unchecked.acceptsOffers, false);
});

test("a checkbox sent with any other value is not accepted as checked", () => {
  const payload = checkoutPayload(formDataWith([["acceptsTerms", "true"]]));

  assert.equal(payload.acceptsTerms, false);
});

// A crafted multipart POST can send a File under any name, and calling a string
// method on one throws instead of validating.
test("a File under a text field becomes an empty string, not a thrown error", () => {
  const file = new File(["not a name"], "name.txt", { type: "text/plain" });
  const payload = checkoutPayload(
    formDataWith([
      ["name", file],
      ["email", file],
      ["phone", file],
      ["idempotencyKey", file],
      ["website", file],
    ]),
  );

  assert.equal(payload.name, "");
  assert.equal(payload.email, "");
  assert.equal(payload.phone, "");
  assert.equal(payload.idempotencyKey, "");
  assert.equal(payload.website, "");
});

test("a File under items becomes an empty list, not a thrown error", () => {
  const file = new File(["[]"], "items.json", { type: "application/json" });
  const payload = checkoutPayload(formDataWith([["items", file]]));

  assert.deepEqual(payload.items, []);
});

test("items that are not valid JSON become an empty list", () => {
  const payload = checkoutPayload(formDataWith([["items", "{oops"]]));

  assert.deepEqual(payload.items, []);
});

test("items are handed over untouched for the schema to judge", () => {
  const payload = checkoutPayload(
    formDataWith([["items", '[{"slug":"x","quantity":2}]']]),
  );

  assert.deepEqual(payload.items, [{ slug: "x", quantity: 2 }]);
});

test("a crafted File payload is refused as a validation error, not a crash", async () => {
  const file = new File(["x"], "name.txt", { type: "text/plain" });
  const result = await placeOrder(
    checkoutPayload(
      formDataWith([
        ["name", file],
        ["email", file],
        ["phone", file],
        ["items", file],
        ["acceptsTerms", "on"],
        ["idempotencyKey", VALID_UUID],
      ]),
    ),
    null,
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "VALIDATION_ERROR");
});
