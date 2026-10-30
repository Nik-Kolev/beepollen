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

function phraseAt(text: string, start: number) {
  const identifier = /TODO_[A-Z0-9_]+\b/y;
  identifier.lastIndex = start;
  const name = identifier.exec(text);
  if (name) return name[0];

  if (text.slice(0, start).trimEnd().endsWith("<Todo>")) {
    return text.slice(start, text.indexOf("</Todo>", start)).trim();
  }

  const open = Math.max(
    ...['"', "'", "`"].map((quote) => text.lastIndexOf(quote, start)),
  );
  const end = open === -1 ? -1 : text.indexOf(text[open], start);
  const quoted = text.slice(start, end === -1 ? undefined : end);
  return end === -1 || /[<>{}]/.test(quoted)
    ? `outside <Todo>: ${quoted.slice(0, 80)}`
    : quoted;
}

const TODOS_BY_FILE = new Map<string, string[]>();

function todosIn(file: string) {
  let todos = TODOS_BY_FILE.get(file);
  if (!todos) {
    const text = readFlat(file);
    todos = [...text.matchAll(/\bTODO/g)].map((match) =>
      phraseAt(text, match.index),
    );
    TODOS_BY_FILE.set(file, todos);
  }
  return todos;
}

test("every TODO in the source is covered by an item on the admin's todo page", () => {
  const uncovered = walkedFiles().flatMap((file) => {
    const markers = ITEMS.filter((item) => item.files.includes(file)).flatMap(
      (item) => item.markers,
    );
    return todosIn(file)
      .filter((todo) => !markers.includes(todo))
      .map((todo) => `${file}: ${todo}`);
  });

  assert.deepEqual(uncovered, []);
});

test("every item on the todo page is still owed in each file it names", () => {
  const filled = ITEMS.flatMap((item) =>
    item.files
      .filter((file) => {
        const todos = todosIn(file);
        return !item.markers.some((marker) => todos.includes(marker));
      })
      .map((file) => `${item.text} — ${file}`),
  );
  const unfound = ITEMS.flatMap((item) =>
    item.markers
      .filter(
        (marker) => !item.files.some((file) => todosIn(file).includes(marker)),
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
