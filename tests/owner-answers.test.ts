import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import {
  EMAIL_ANSWER_KEY,
  exportOwnerAnswers,
  isOwnerAnswerKey,
  listOwnerAnswers,
  OWNER_ANSWER_MAX_LENGTH,
  productAnswerKey,
  saveOwnerAnswer,
} from "@/lib/owner-answers";
import { OWNER_TODOS } from "@/lib/owner-todos";
import prisma from "@/lib/prisma";

const ADMIN = "admin@example.com";

beforeEach(async () => {
  await prisma.ownerAnswer.deleteMany();
});

after(async () => {
  await prisma.ownerAnswer.deleteMany();
  await prisma.$disconnect();
});

test("every answerable todo item, every product field, the price and the emails have a key", () => {
  for (const item of OWNER_TODOS.flatMap((group) => group.items)) {
    if (item.id) assert.ok(isOwnerAnswerKey(item.id), item.id);
  }
  assert.ok(isOwnerAnswerKey(EMAIL_ANSWER_KEY));
  assert.ok(
    isOwnerAnswerKey(productAnswerKey("pchelen-prashets-1kg", "price")),
  );
  assert.ok(
    isOwnerAnswerKey(productAnswerKey("pchelen-prashets-1kg", "composition")),
  );
});

test("the todo items' keys are unique", () => {
  const ids = OWNER_TODOS.flatMap((group) =>
    group.items.flatMap((item) => (item.id ? [item.id] : [])),
  );
  assert.equal(new Set(ids).size, ids.length);
});

test("a key the page never renders is refused and nothing is stored", async () => {
  for (const key of [
    "seller-name-addressx",
    "product:pchelen-prashets-1kg:priceCents",
    "product:pchelen-prashets-1kg:toString",
    "product:Pchelen:price",
    "product::price",
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
      { key: "hosting", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH + 1) },
      ADMIN,
    ),
    { ok: false, code: "TOO_LONG" },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      { key: "hosting", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH) },
      ADMIN,
    ),
    { ok: true },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      {
        key: "hosting",
        text: ` \n${"а".repeat(OWNER_ANSWER_MAX_LENGTH)}\n `,
      },
      ADMIN,
    ),
    { ok: true },
  );
});

test("saving again overwrites the answer, trimmed, and records who saved it", async () => {
  await saveOwnerAnswer({ key: "hosting", text: "DigitalOcean" }, ADMIN);
  await saveOwnerAnswer(
    { key: "hosting", text: "  DigitalOcean, Франкфурт \n" },
    "owner@example.com",
  );

  const row = await prisma.ownerAnswer.findUniqueOrThrow({
    where: { key: "hosting" },
  });
  assert.equal(row.text, "DigitalOcean, Франкфурт");
  assert.equal(row.updatedBy, "owner@example.com");
  assert.equal((await listOwnerAnswers()).get("hosting"), row.text);
});

test("the export names each question in page order and leaves out cleared answers", async () => {
  const price = productAnswerKey("pchelen-prashets-1kg", "price");
  const composition = productAnswerKey("pchelen-prashets-1kg", "composition");
  const withdrawn = productAnswerKey("spryan-produkt", "price");
  const hosting = OWNER_TODOS.flatMap((group) => group.items).find(
    (item) => item.id === "hosting",
  );
  for (const [key, text] of [
    [EMAIL_ANSWER_KEY, "По-кратко"],
    ["hosting", "DigitalOcean"],
    ["seller-name-address", "Пчелни продукти"],
    [withdrawn, "10"],
    [composition, "Прашец"],
    [price, "24,50"],
    ["dispute-body", ""],
  ]) {
    await saveOwnerAnswer({ key, text }, ADMIN);
  }

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
        key: price,
        question: "Пчелен прашец 1 кг: Цена (€)",
        text: "24,50",
        updatedBy: ADMIN,
      },
      {
        key: composition,
        question: "Пчелен прашец 1 кг: Състав",
        text: "Прашец",
        updatedBy: ADMIN,
      },
      {
        key: withdrawn,
        question: "spryan-produkt: Цена (€)",
        text: "10",
        updatedBy: ADMIN,
      },
      {
        key: "seller-name-address",
        question:
          "Име и правен статус, адрес по регистрация и за кореспонденция.",
        text: "Пчелни продукти",
        updatedBy: ADMIN,
      },
      {
        key: "hosting",
        question: hosting?.text,
        text: "DigitalOcean",
        updatedBy: ADMIN,
      },
      {
        key: EMAIL_ANSWER_KEY,
        question: "Предложения за имейлите",
        text: "По-кратко",
        updatedBy: ADMIN,
      },
    ],
  );
});
