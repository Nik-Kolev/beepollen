import assert from "node:assert/strict";
import { test } from "node:test";

import { ipFromHeaders } from "@/lib/client-ip";

test("the proxy's own x-real-ip wins over any forwarded chain", () => {
  assert.equal(
    ipFromHeaders(
      new Headers({
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1, 198.51.100.2",
      }),
    ),
    "203.0.113.9",
  );
});

test("without x-real-ip the last forwarded hop is used, never the one the caller wrote first", () => {
  assert.equal(
    ipFromHeaders(
      new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1 , 203.0.113.9 " }),
    ),
    "203.0.113.9",
  );
});

test("a blank x-real-ip falls back to the forwarded chain", () => {
  assert.equal(
    ipFromHeaders(
      new Headers({ "x-real-ip": "  ", "x-forwarded-for": "203.0.113.9" }),
    ),
    "203.0.113.9",
  );
});

test("no usable address reads as none", () => {
  assert.equal(ipFromHeaders(new Headers()), null);
  assert.equal(ipFromHeaders(new Headers({ "x-forwarded-for": " , " })), null);
});
