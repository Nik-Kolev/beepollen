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

const OWNER_ITEMS = OWNER_PAGE_GROUPS.flatMap((group) => group.items);

const OWNER_IDS = OWNER_ITEMS.flatMap((item) => (item.id ? [item.id] : []));

function question(id: string) {
  const item = OWNER_ITEMS.find((candidate) => candidate.id === id);
  assert.ok(item, id);
  return item.text;
}

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
    "producers-textx",
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
      { key: "producers-text", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH + 1) },
      ADMIN,
    ),
    { ok: false, code: "TOO_LONG" },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      { key: "producers-text", text: "а".repeat(OWNER_ANSWER_MAX_LENGTH) },
      ADMIN,
    ),
    { ok: true },
  );
  assert.deepEqual(
    await saveOwnerAnswer(
      {
        key: "producers-text",
        text: ` \n${"а".repeat(OWNER_ANSWER_MAX_LENGTH)}\n `,
      },
      ADMIN,
    ),
    { ok: true },
  );
});

test("saving again overwrites the answer, trimmed, and records who saved it", async () => {
  await saveOwnerAnswer({ key: "producers-text", text: "5 години" }, ADMIN);
  await saveOwnerAnswer(
    { key: "producers-text", text: "  5 години, после се трият \n" },
    "owner@example.com",
  );

  const row = await prisma.ownerAnswer.findUniqueOrThrow({
    where: { key: "producers-text" },
  });
  assert.equal(row.text, "5 години, после се трият");
  assert.equal(row.updatedBy, "owner@example.com");
  assert.equal((await listOwnerAnswers()).get("producers-text"), row.text);
});

test("the export names each question in page order and leaves out cleared answers", async () => {
  const storage = productAnswerKey("pchelen-prashets-1kg", "storage");
  const composition = productAnswerKey("pchelen-prashets-1kg", "composition");
  const withdrawn = productAnswerKey("spryan-produkt", "origin");
  const cleared = productAnswerKey("pchelen-prashets-1kg", "summary");
  for (const [key, text] of [
    ["producers-text", "Пчелари сме"],
    [withdrawn, "България"],
    [storage, "На сухо"],
    [composition, "Прашец"],
    [cleared, ""],
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
      { key: "return-costs", text: "Съгласен", updatedBy: ADMIN },
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
        key: "producers-text",
        question: question("producers-text"),
        text: "Пчелари сме",
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
      {
        key: "return-costs",
        question: "return-costs",
        text: "Съгласен",
        updatedBy: ADMIN,
      },
    ],
  );
});
