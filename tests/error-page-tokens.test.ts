import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const FILES = [
  "src/app/(shop)/error.tsx",
  "src/app/admin/error.tsx",
  "src/app/global-error.tsx",
  "src/app/not-found.tsx",
  "src/app/(shop)/not-found.tsx",
  "src/components/not-found-content.tsx",
  "src/components/retry-button.tsx",
];

const COLOUR_UTILITY =
  /^(?:bg|text|border(?:-[xytrbls])?|ring|ring-offset|outline|divide|fill|stroke|decoration|placeholder|accent|caret|shadow|from|via|to)-(.+)$/;

function isRawColour(className: string) {
  const utility = className.split(":").at(-1)!.replace(/^!/, "");
  const value = COLOUR_UTILITY.exec(utility)?.[1].split("/")[0];
  if (!value) return false;

  return (
    /^[a-z]+-\d{2,3}$/.test(value) ||
    value === "black" ||
    value === "white" ||
    /^\[(?:#|oklch|rgb|hsl|color|var)/.test(value)
  );
}

function rawColours(source: string) {
  return source.split(/[\s"'`{}()]+/).filter(isRawColour);
}

const INLINE_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/i;

for (const file of FILES) {
  test(`${file} colours only through theme tokens`, () => {
    const source = readFileSync(file, "utf8");
    assert.deepEqual(rawColours(source), []);
    assert.doesNotMatch(source, INLINE_COLOUR);
  });
}

test("the guard catches palette, black, white and arbitrary colours, and nothing else", () => {
  assert.deepEqual(
    rawColours(
      'className="text-stone-600 hover:bg-stone-900 bg-[#fff] border-white text-ink bg-action/30 text-sm ring-2 text-[13px] border-x-2"',
    ),
    ["text-stone-600", "hover:bg-stone-900", "bg-[#fff]", "border-white"],
  );
});
