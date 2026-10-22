import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyticsCookieNames,
  clearAnalyticsCookies,
  expiringWrites,
} from "@/lib/analytics-cookies";

test("only Google Analytics cookies are picked out", () => {
  assert.deepEqual(
    analyticsCookieNames(
      "_ga=GA1.1.1; theme=light; _ga_ABC123=GS1.1; _gat=1; _gallery=x",
    ),
    ["_ga", "_ga_ABC123"],
  );
  assert.deepEqual(analyticsCookieNames(""), []);
});

test("a cookie is expired on the host and on every parent domain GA may have used", () => {
  assert.deepEqual(expiringWrites("_ga", "shop.beepollen.bg"), [
    "_ga=; Max-Age=0; Path=/",
    "_ga=; Max-Age=0; Path=/; Domain=.shop.beepollen.bg",
    "_ga=; Max-Age=0; Path=/; Domain=.beepollen.bg",
  ]);
});

test("on localhost the cookie is expired without a domain", () => {
  assert.deepEqual(expiringWrites("_ga", "localhost"), [
    "_ga=; Max-Age=0; Path=/",
  ]);
});

test("clearing writes an expiry for every analytics cookie and touches nothing else", () => {
  const writes: string[] = [];
  const target = {
    get cookie() {
      return "_ga=1; theme=light; _ga_X=2";
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };

  clearAnalyticsCookies(target, "beepollen.bg");

  assert.deepEqual(writes, [
    "_ga=; Max-Age=0; Path=/",
    "_ga=; Max-Age=0; Path=/; Domain=.beepollen.bg",
    "_ga_X=; Max-Age=0; Path=/",
    "_ga_X=; Max-Age=0; Path=/; Domain=.beepollen.bg",
  ]);
});
