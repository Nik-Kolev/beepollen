import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertPublishable,
  missingFoodInformation,
  REQUIRED_FOOD_INFORMATION,
} from "@/lib/food-information";

const COMPLETE = {
  slug: "pchelen-prashets-500g",
  isPublished: true,
  netWeightGrams: 500,
  composition: "Пчелен прашец",
  origin: "България",
  storage: "На сухо и хладно място",
  allergenInfo: "Може да предизвика алергия",
};

test("a product with every pre-purchase field filled can be published", () => {
  assert.deepEqual(missingFoodInformation(COMPLETE), []);
  assert.doesNotThrow(() => assertPublishable(COMPLETE));
});

for (const field of REQUIRED_FOOD_INFORMATION) {
  test(`a published product without ${field} is refused, naming it`, () => {
    const product = { ...COMPLETE, [field]: null };

    assert.deepEqual(missingFoodInformation(product), [field]);
    assert.throws(
      () => assertPublishable(product),
      new RegExp(`pchelen-prashets-500g is published without ${field}`),
    );
  });
}

for (const field of [
  "composition",
  "origin",
  "storage",
  "allergenInfo",
] as const) {
  test(`blank ${field} counts as missing`, () => {
    assert.deepEqual(missingFoodInformation({ ...COMPLETE, [field]: "  " }), [
      field,
    ]);
  });
}

test("a net weight of zero, below zero or a fraction counts as missing", () => {
  for (const netWeightGrams of [0, -500, 0.5, NaN, Infinity]) {
    assert.deepEqual(missingFoodInformation({ ...COMPLETE, netWeightGrams }), [
      "netWeightGrams",
    ]);
  }
});

test("a TODO: placeholder counts as filled, since it is visible on purpose", () => {
  assert.deepEqual(
    missingFoodInformation({
      ...COMPLETE,
      composition: "TODO: състав",
      origin: "TODO: страна на добив",
      storage: "TODO: условия на съхранение",
      allergenInfo: "TODO: алергени",
    }),
    [],
  );
});

test("best-before is not required before purchase", () => {
  assert.doesNotThrow(() =>
    assertPublishable({ ...COMPLETE, bestBefore: null } as typeof COMPLETE),
  );
});

test("a field the seed left out entirely counts as missing", () => {
  const withoutOrigin: Record<string, unknown> = { ...COMPLETE };
  delete withoutOrigin.origin;

  assert.deepEqual(
    missingFoodInformation(withoutOrigin as unknown as typeof COMPLETE),
    ["origin"],
  );
});

test("an unpublished draft may lack everything", () => {
  assert.doesNotThrow(() =>
    assertPublishable({
      slug: "draft",
      isPublished: false,
      netWeightGrams: null,
      composition: null,
      origin: null,
      storage: null,
      allergenInfo: null,
    }),
  );
});

test("every missing field is named at once", () => {
  assert.throws(
    () =>
      assertPublishable({
        ...COMPLETE,
        origin: null,
        storage: "",
      }),
    /published without origin, storage\./,
  );
});
