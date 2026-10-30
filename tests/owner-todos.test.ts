import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { missingProductFields, OWNER_TODOS } from "@/lib/owner-todos";

const NOT_OWED = new Set([
  "src/lib/owner-todos.ts",
  "src/app/admin/todo/page.tsx",
]);

const ITEMS = OWNER_TODOS.flatMap((group) => group.items);

function readFlat(file: string) {
  return readFileSync(file, "utf8").replace(/\s+/g, " ");
}

function walkedFiles() {
  const sources = (readdirSync("src", { recursive: true }) as string[])
    .map((file) => join("src", file).replaceAll("\\", "/"))
    .filter(
      (file) =>
        statSync(file).isFile() &&
        !file.startsWith("src/generated/") &&
        !NOT_OWED.has(file),
    );
  return [...sources, "prisma/seed.ts"];
}

function todosIn(text: string) {
  return [...text.matchAll(/TODO/g)].map((match) =>
    text.slice(match.index, match.index + 80),
  );
}

test("every TODO in the source is covered by an item on the admin's todo page", () => {
  const uncovered = walkedFiles().flatMap((file) => {
    const markers = ITEMS.filter((item) => item.files.includes(file)).flatMap(
      (item) => item.markers,
    );
    return todosIn(readFlat(file))
      .filter((todo) => !markers.some((marker) => todo.startsWith(marker)))
      .map((todo) => `${file}: ${todo}`);
  });

  assert.deepEqual(uncovered, []);
});

test("every item on the todo page is still owed in each file it names", () => {
  const filled = ITEMS.flatMap((item) =>
    item.files
      .filter((file) => {
        const text = readFlat(file);
        return !item.markers.some((marker) => text.includes(marker));
      })
      .map((file) => `${item.text} — ${file}`),
  );
  const unfound = ITEMS.flatMap((item) =>
    item.markers
      .filter(
        (marker) => !item.files.some((file) => readFlat(file).includes(marker)),
      )
      .map((marker) => `${item.text} — ${marker}`),
  );

  assert.deepEqual([...filled, ...unfound], []);
});

const FILLED = {
  summary: "Сушен пчелен прашец.",
  description: "Събран от нашия пчелин.",
  variety: "40% акация, 60% липа",
  netWeightGrams: 500,
  composition: "Пчелен прашец",
  origin: "България",
  storage: "На сухо",
  bestBefore: "12 месеца",
  allergenInfo: "Може да предизвика алергия",
};

test("a product with every field filled owes nothing", () => {
  assert.deepEqual(missingProductFields(FILLED), []);
});

test("an empty, blank, TODO or Lorem ipsum field is owed, under its label", () => {
  assert.deepEqual(
    missingProductFields({
      ...FILLED,
      description: "Lorem ipsum dolor sit amet.",
      variety: null,
      netWeightGrams: null,
      composition: "  ",
      origin: "TODO: страна на добив",
    }),
    ["Описание", "Сорт", "Нетно количество", "Състав", "Произход"],
  );
});
