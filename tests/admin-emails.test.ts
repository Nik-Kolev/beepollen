import assert from "node:assert/strict";
import { test } from "node:test";

import { isAdminEmail, parseAdminEmails } from "@/lib/admin-emails";

test("parses a comma-separated list, trimming and lowercasing each address", () => {
  assert.deepEqual(
    [...parseAdminEmails(" Owner@Example.com , dev@example.com ")],
    ["owner@example.com", "dev@example.com"],
  );
});

test("drops empty entries left by stray commas", () => {
  assert.deepEqual(
    [...parseAdminEmails(",a@example.com,,")],
    ["a@example.com"],
  );
});

test("an unset or empty list admits no one", () => {
  assert.equal(isAdminEmail("a@example.com", undefined), false);
  assert.equal(isAdminEmail("a@example.com", ""), false);
  assert.equal(isAdminEmail("", ""), false);
});

test("admits a listed address regardless of case or surrounding space", () => {
  assert.equal(isAdminEmail(" A@Example.COM ", "a@example.com"), true);
});

test("refuses an address not on the list", () => {
  assert.equal(isAdminEmail("b@example.com", "a@example.com"), false);
});

test("refuses a missing address", () => {
  assert.equal(isAdminEmail(null, "a@example.com"), false);
  assert.equal(isAdminEmail(undefined, "a@example.com"), false);
});

test("matches whole addresses only, never a suffix or prefix", () => {
  assert.equal(isAdminEmail("xa@example.com", "a@example.com"), false);
  assert.equal(isAdminEmail("a@example.com.evil", "a@example.com"), false);
});
