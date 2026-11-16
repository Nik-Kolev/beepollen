import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import {
  exportOwnerAnswers,
  isOwnerAnswerKey,
  listOwnerAnswers,
  OWNER_ANSWER_MAX_LENGTH,
  productAnswerKey,
  saveOwnerAnswer,
} from "@/lib/owner-answers";
import { OWNER_PAGE_GROUPS } from "@/lib/owner-todos";
import prisma from "@/lib/prisma";

const ADMIN = "admin@example.com";

beforeEach(async () => {
  await prisma.ownerAnswer.deleteMany();
});

after(async () => {
  await prisma.ownerAnswer.deleteMany();
  await prisma.$disconnect();
});

const OWNER_IDS = OWNER_PAGE_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => (item.id ? [item.id] : [])),
);

test("every answerable todo item and every product field have a key", () => {
  for (const id of OWNER_IDS) assert.ok(isOwnerAnswerKey(id), id);
  assert.ok(
    isOwnerAnswerKey(productAnswerKey("pchelen-prashets-1kg", "composition")),
  );
});

test("the todo items' keys are unique", () => {
  assert.equal(new Set(OWNER_IDS).size, OWNER_IDS.length);
});

test("a key the page never renders is refused and nothing is stored", async () => {
  for (const key of [
    "food-registrationx",
    "emails",
    "hosting",
    "contact-email",
    "publication-date",
    "product:pchelen-prashets-1kg:price",
    "product:pchelen-prashets-1kg:variety",
    "product:pchelen-prashets-1kg:priceCents",
    "product:pchelen-prashets-1kg:toString",
    "product:Pchelen:storage",
    "product::storage",
    "",
  ]) {
    assert.deepEqual(
      await saveOwnerAnswer({ key, text: "x" }, ADMIN),
      { ok: false, code: "INVALID_INPUT" },
      key,
    );
  }
  assert.deepEqual(await saveOwnerAnswer({ key: 1, text: "x" }, ADMIN), {
    ok: false,
    code: "INVALID_INPUT",
  });
  assert.equal(await prisma.ownerAnswer.count(), 0);
});

test("an answer over the limit is refused, one at the limit is kept", async () => {
  assert.deepEqual(
    await saveOwnerAnswer(
      { key: "seller-vat", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH + 1) },
      ADMIN,
    ),
    { ok: false, code: "TOO_LONG" },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      { key: "seller-vat", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH) },
      ADMIN,
    ),
    { ok: true },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      {
        key: "seller-vat",
        text: ` \n${"а".repeat(OWNER_ANSWER_MAX_LENGTH)}\n `,
      },
      ADMIN,
    ),
    { ok: true },
  );
});

test("saving again overwrites the answer, trimmed, and records who saved it", async () => {
  await saveOwnerAnswer({ key: "seller-vat", text: "5 години" }, ADMIN);
  await saveOwnerAnswer(
    { key: "seller-vat", text: "  5 години, после се трият \n" },
    "owner@example.com",
  );

  const row = await prisma.ownerAnswer.findUniqueOrThrow({
    where: { key: "seller-vat" },
  });
  assert.equal(row.text, "5 години, после се трият");
  assert.equal(row.updatedBy, "owner@example.com");
  assert.equal((await listOwnerAnswers()).get("seller-vat"), row.text);
});

test("the export names each question in page order and leaves out cleared answers", async () => {
  const storage = productAnswerKey("pchelen-prashets-1kg", "storage");
  const composition = productAnswerKey("pchelen-prashets-1kg", "composition");
  const withdrawn = productAnswerKey("spryan-produkt", "origin");
  assert.ok(OWNER_IDS.includes("seller-vat"));
  for (const [key, text] of [
    ["food-registration", "Не трябва"],
    ["seller-vat", "Не"],
    [withdrawn, "България"],
    [storage, "На сухо"],
    [composition, "Прашец"],
    ["farmer-status", ""],
  ]) {
    await saveOwnerAnswer({ key, text }, ADMIN);
  }
  await prisma.ownerAnswer.createMany({
    data: [
      {
        key: "product:pchelen-prashets-1kg:price",
        text: "15",
        updatedBy: ADMIN,
      },
      { key: "hosting", text: "DigitalOcean", updatedBy: ADMIN },
    ],
  });

  const rows = await exportOwnerAnswers([
    { slug: "pchelen-prashets-1kg", name: "Пчелен прашец 1 кг" },
  ]);

  assert.deepEqual(
    rows.map(({ key, question, text, updatedBy }) => ({
      key,
      question,
      text,
      updatedBy,
    })),
    [
      {
        key: composition,
        question: "Пчелен прашец 1 кг: Състав",
        text: "Прашец",
        updatedBy: ADMIN,
      },
      {
        key: storage,
        question: "Пчелен прашец 1 кг: Условия на съхранение",
        text: "На сухо",
        updatedBy: ADMIN,
      },
      {
        key: withdrawn,
        question: "spryan-produkt: Произход",
        text: "България",
        updatedBy: ADMIN,
      },
      {
        key: "seller-vat",
        question: "Регистриран ли сте по ЗДДС? Ако да — номерът.",
        text: "Не",
        updatedBy: ADMIN,
      },
      {
        key: "food-registration",
        question:
          "Трябва ли регистрация в БАБХ за продажбата на прашеца? Ако трябва и я имате — номерът и за какво е.",
        text: "Не трябва",
        updatedBy: ADMIN,
      },
      {
        key: "hosting",
        question: "hosting",
        text: "DigitalOcean",
        updatedBy: ADMIN,
      },
      {
        key: "product:pchelen-prashets-1kg:price",
        question: "product:pchelen-prashets-1kg:price",
        text: "15",
        updatedBy: ADMIN,
      },
    ],
  );
});
