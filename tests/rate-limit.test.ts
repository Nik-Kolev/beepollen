import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  MAX_KEYS,
  rateLimitSubject,
  resetRateLimits,
  takeToken,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
});

test("an IPv4 address is its own subject", () => {
  assert.equal(rateLimitSubject("198.51.100.10"), "198.51.100.10");
  assert.notEqual(
    rateLimitSubject("198.51.100.10"),
    rateLimitSubject("198.51.100.11"),
  );
});

test("every IPv6 address in one /64 is the same subject, however it is written", () => {
  const subject = "2001:db8:12:3400::/64";

  for (const address of [
    "2001:db8:12:3400::1",
    "2001:0db8:0012:3400:0000:0000:0000:0001",
    "2001:DB8:12:3400:ffff:ffff:ffff:ffff",
    "2001:db8:12:3400:a:b:c:d",
    "2001:db8:12:3400::192.0.2.1",
    "2001:db8:12:3400::1%eth0",
  ]) {
    assert.equal(rateLimitSubject(address), subject, address);
  }
});

test("IPv6 addresses in neighbouring /64 blocks are different subjects", () => {
  assert.equal(
    rateLimitSubject("2001:db8:12:3401::1"),
    "2001:db8:12:3401::/64",
  );
  assert.equal(rateLimitSubject("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(rateLimitSubject("::1"), "0:0:0:0::/64");
});

test("an IPv4 address written as IPv6 is counted with the plain IPv4 address", () => {
  assert.equal(rateLimitSubject("::ffff:198.51.100.10"), "198.51.100.10");
  assert.equal(rateLimitSubject("::ffff:c633:640a"), "198.51.100.10");
});

test("a value that is no address at all is passed through as its own subject", () => {
  assert.equal(rateLimitSubject("unknown"), "unknown");
  assert.equal(rateLimitSubject("2001:db8::1::2"), "2001:db8::1::2");
});

test("allows up to the configured limit of tokens inside one window and blocks the next", () => {
  const options = { limit: 3, windowMs: 1000 };

  assert.equal(takeToken("a", options, 0), true);
  assert.equal(takeToken("a", options, 0), true);
  assert.equal(takeToken("a", options, 0), true);
  assert.equal(takeToken("a", options, 0), false);
});

test("blocks a token requested exactly windowMs - 1 milliseconds after the window opened", () => {
  const options = { limit: 1, windowMs: 1000 };

  assert.equal(takeToken("b", options, 0), true);
  assert.equal(takeToken("b", options, 999), false);
});

test("allows a token requested exactly windowMs + 1 milliseconds after the window opened", () => {
  const options = { limit: 1, windowMs: 1000 };

  assert.equal(takeToken("c", options, 0), true);
  assert.equal(takeToken("c", options, 1001), true);
});

test("tracks separate keys independently", () => {
  const options = { limit: 1, windowMs: 1000 };

  assert.equal(takeToken("d", options, 0), true);
  assert.equal(takeToken("e", options, 0), true);
  assert.equal(takeToken("d", options, 0), false);
});

test("resetRateLimits clears every key's recorded history", () => {
  const options = { limit: 1, windowMs: 1000 };

  assert.equal(takeToken("f", options, 0), true);
  assert.equal(takeToken("f", options, 0), false);

  resetRateLimits();

  assert.equal(takeToken("f", options, 0), true);
});

test("a burst of distinct keys inside one window evicts the oldest, even though none of them are stale yet", () => {
  const options = { limit: 1, windowMs: 60_000 };

  assert.equal(takeToken("burst-0", options, 1000), true);
  assert.equal(takeToken("burst-0", options, 1000), false);

  for (let i = 1; i < MAX_KEYS + 500; i++) {
    takeToken(`burst-${i}`, options, 1000);
  }

  assert.equal(
    takeToken("burst-0", options, 1000),
    true,
    "the oldest key must have been evicted, or the map grew past MAX_KEYS",
  );
});

test("re-reading a blocked key moves it behind the keys inserted before it, so those are evicted first", () => {
  const options = { limit: 1, windowMs: 60_000 };
  const early = MAX_KEYS / 2;
  const late = MAX_KEYS / 2 + 100;

  assert.equal(takeToken("kept", options, 1000), true);

  for (let i = 0; i < early; i++) {
    takeToken(`early-${i}`, options, 1000);
  }

  assert.equal(takeToken("kept", options, 1000), false);

  for (let i = 0; i < late; i++) {
    takeToken(`late-${i}`, options, 1000);
  }

  assert.equal(
    takeToken("early-0", options, 1000),
    true,
    "the oldest key should have been evicted",
  );
  assert.equal(
    takeToken("kept", options, 1000),
    false,
    "a key re-read after those keys should have outlived them",
  );
});
