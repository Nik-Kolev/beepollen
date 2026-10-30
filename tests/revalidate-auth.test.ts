import assert from "node:assert/strict";
import { test } from "node:test";

import { isRevalidateAuthorized } from "@/lib/revalidate-auth";

const SECRET = "revalidate-secret-for-unit-tests-only";
const ENV = { REVALIDATE_SECRET: SECRET };

test("the bearer secret is accepted", () => {
  assert.equal(isRevalidateAuthorized(`Bearer ${SECRET}`, ENV), true);
});

test("a missing, wrong or bare header is refused", () => {
  for (const header of [
    null,
    "",
    SECRET,
    `Bearer ${SECRET}x`,
    `Bearer ${SECRET.slice(0, -1)}`,
    `Basic ${SECRET}`,
  ]) {
    assert.equal(isRevalidateAuthorized(header, ENV), false, String(header));
  }
});

test("every request is refused while the secret is unset or short", () => {
  for (const value of [undefined, "", "too-short-to-be-a-secret"]) {
    const env = { REVALIDATE_SECRET: value };
    assert.equal(isRevalidateAuthorized(`Bearer ${value}`, env), false);
    assert.equal(isRevalidateAuthorized("Bearer ", env), false);
  }
});
