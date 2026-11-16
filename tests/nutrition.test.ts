import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  formatNutrient,
  nutritionRows,
  WEB_NUTRITION_PER_100G,
} from "@/lib/nutrition";
import { OWNER_TODOS } from "@/lib/owner-todos";
import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

test("the web values render as the declaration, in the regulation's order", () => {
  assert.deepEqual(
    nutritionRows(WEB_NUTRITION_PER_100G)?.map(({ label, value, nested }) => [
      label,
      value,
      nested,
    ]),
    [
      ["Енергийна стойност", "1563 kJ / 371 kcal", false],
      ["Мазнини", "6,1 г", false],
      ["от които наситени мастни киселини", "2,2 г", true],
      ["Въглехидрати", "54 г", false],
      ["от които захари", "41 г", true],
      ["Белтъчини", "19 г", false],
      ["Сол", "0,03 г", false],
    ],
  );
});

test("the declared energy matches the nutrients and 12 g of fibre by the EU conversion factors", () => {
  const { fatMg, carbohydrateMg, proteinMg, energyKj, energyKcal } =
    WEB_NUTRITION_PER_100G;
  const fibre = 12;
  const g = (mg: number) => mg / 1000;

  assert.equal(
    Math.round(
      g(fatMg) * 37 + g(carbohydrateMg) * 17 + g(proteinMg) * 17 + fibre * 8,
    ),
    energyKj,
  );
  assert.equal(
    Math.round(
      g(fatMg) * 9 + g(carbohydrateMg) * 4 + g(proteinMg) * 4 + fibre * 2,
    ),
    energyKcal,
  );
});

test("a declaration with any value missing is not shown at all", () => {
  for (const field of Object.keys(WEB_NUTRITION_PER_100G)) {
    assert.equal(
      nutritionRows({ ...WEB_NUTRITION_PER_100G, [field]: null }),
      null,
      field,
    );
  }
});

test("nutrients round to a whole gram from 10 g and to a tenth below it", () => {
  assert.equal(formatNutrient("carbohydrateMg", 54_400), "54 г");
  assert.equal(formatNutrient("carbohydrateMg", 10_000), "10 г");
  assert.equal(formatNutrient("proteinMg", 10_400), "10 г");
  assert.equal(formatNutrient("fatMg", 9_960), "10 г");
  assert.equal(formatNutrient("fatMg", 6_140), "6,1 г");
  assert.equal(formatNutrient("proteinMg", 600), "0,6 г");
  assert.equal(formatNutrient("proteinMg", 500), "0 г");
});

test("saturates show down to 0,1 g and salt to the hundredth below 1 g", () => {
  assert.equal(formatNutrient("saturatesMg", 10_400), "10 г");
  assert.equal(formatNutrient("saturatesMg", 300), "0,3 г");
  assert.equal(formatNutrient("saturatesMg", 100), "0 г");
  assert.equal(formatNutrient("saturatesMg", 90), "0 г");
  assert.equal(formatNutrient("saltMg", 1_240), "1,2 г");
  assert.equal(formatNutrient("saltMg", 1_000), "1 г");
  assert.equal(formatNutrient("saltMg", 30), "0,03 г");
  assert.equal(formatNutrient("saltMg", 13), "0,01 г");
  assert.equal(formatNutrient("saltMg", 12), "0 г");
});

test("the owner is asked about every nutrient but not the energy, which is calculated", () => {
  const ids = OWNER_TODOS.flatMap((group) => group.items).map(
    (item) => item.id,
  );

  assert.deepEqual(
    ids.filter((id) => id?.startsWith("nutrition-")),
    [
      "nutrition-declaration",
      "nutrition-fat",
      "nutrition-saturates",
      "nutrition-carbohydrate",
      "nutrition-sugars",
      "nutrition-protein",
      "nutrition-salt",
    ],
  );
});

test("the seed writes the declaration onto every published product", async () => {
  const products = await prisma.product.findMany({
    where: { isPublished: true, slug: { startsWith: "pchelen-prashets" } },
  });

  assert.ok(products.length > 0);
  for (const product of products) {
    for (const [field, value] of Object.entries(WEB_NUTRITION_PER_100G)) {
      assert.equal(
        product[field as keyof typeof WEB_NUTRITION_PER_100G],
        value,
      );
    }
  }
});
