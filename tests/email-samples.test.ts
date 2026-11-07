import assert from "node:assert/strict";
import { after, test } from "node:test";

import { PREVIEWS } from "@/lib/email/previews";
import { SAMPLE_SUBJECT_PREFIX, sendSamples } from "@/lib/email/samples";
import type { Outgoing, Sent } from "@/lib/email/transport";
import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

function recorder(statusOf: (index: number) => Sent["status"] = () => "SENT") {
  const sent: Outgoing[] = [];
  const send = async (outgoing: Outgoing): Promise<Sent> => {
    const status = statusOf(sent.length);
    sent.push(outgoing);
    return { status, resendEmailId: null };
  };
  return { sent, send };
}

test("every email is sent once as a sample to the address typed, trimmed and lowercased", async () => {
  const { sent, send } = recorder();

  const result = await sendSamples({ to: "  Owner@Example.com " }, send);

  assert.equal(sent.length, PREVIEWS.length);
  for (const [index, preview] of PREVIEWS.entries()) {
    const message = preview.render();
    assert.equal(sent[index].to, "owner@example.com");
    assert.equal(
      sent[index].message.subject,
      `${SAMPLE_SUBJECT_PREFIX}${message.subject}`,
    );
    assert.equal(sent[index].message.html, message.html);
    assert.equal(sent[index].message.text, message.text);
  }
  assert.deepEqual(result, {
    ok: true,
    results: PREVIEWS.map((preview) => ({
      title: preview.title,
      status: "SENT",
    })),
  });
});

test("an address that is not an email sends nothing", async () => {
  const tooLong = `${"a".repeat(195)}@example.com`;
  for (const input of [
    { to: "" },
    { to: "abc" },
    { to: "a@" },
    { to: 42 },
    { to: undefined },
    { to: tooLong },
    null,
  ]) {
    const { sent, send } = recorder();
    assert.deepEqual(await sendSamples(input, send), {
      ok: false,
      code: "INVALID_EMAIL",
    });
    assert.equal(sent.length, 0);
  }
});

test("every email of a run, and every run, has its own idempotency key, so pressing again sends again", async () => {
  const first = recorder();
  const second = recorder();

  await sendSamples({ to: "owner@example.com" }, first.send);
  await sendSamples({ to: "owner@example.com" }, second.send);

  const keys = [...first.sent, ...second.sent].map((o) => o.idempotencyKey);
  assert.equal(new Set(keys).size, PREVIEWS.length * 2);
});

test("a failed email is reported on its own line and the rest are still sent", async () => {
  const { sent, send } = recorder((index) => (index === 1 ? "FAILED" : "SENT"));

  const result = await sendSamples({ to: "owner@example.com" }, send);

  assert.equal(sent.length, PREVIEWS.length);
  assert.ok(result.ok);
  assert.deepEqual(
    result.results.map((r) => r.status),
    PREVIEWS.map((_, index) => (index === 1 ? "FAILED" : "SENT")),
  );
});
