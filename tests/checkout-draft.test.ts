import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseDraft,
  serializeDraft,
  type CheckoutDraft,
} from "@/lib/checkout-draft";

const DRAFT: CheckoutDraft = {
  name: "Мария Иванова",
  email: "maria.ivanova@example.com",
  phone: "0899777888",
  localDelivery: false,
  city: "Павликени",
  officeCode: "5800",
};

test("a serialized draft parses back to the same answers", () => {
  assert.deepEqual(parseDraft(serializeDraft(DRAFT)), DRAFT);
});

test("a draft never carries a consent or the honeypot back", () => {
  const raw = JSON.stringify({
    ...JSON.parse(serializeDraft(DRAFT)),
    acceptsTerms: true,
    acceptsOffers: true,
    website: "https://spam.example",
  });

  assert.deepEqual(parseDraft(raw), DRAFT);
});

test("nothing stored, unreadable JSON or another version is discarded", () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft("{not json"), null);
  assert.equal(
    parseDraft(
      JSON.stringify({ ...JSON.parse(serializeDraft(DRAFT)), version: 2 }),
    ),
    null,
  );
});

test("a draft with a field of the wrong type is discarded", () => {
  assert.equal(
    parseDraft(
      JSON.stringify({
        ...JSON.parse(serializeDraft(DRAFT)),
        localDelivery: "yes",
      }),
    ),
    null,
  );
});
