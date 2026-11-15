import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import {
  B2_AUTHORIZE_URL,
  B2_TIMEOUTS,
  b2Credentials,
  uploadName,
  uploadToB2,
} from "@/lib/b2-upload";

const CREDENTIALS = { keyId: "key-id", applicationKey: "secret-app-key" };
const BYTES = Buffer.from("SQLite format 3\0 backup bytes");
const API_URL = "https://api005.backblazeb2.com";
const UPLOAD_URL =
  "https://pod-050-1000-00.backblaze.com/b2api/v3/b2_upload_file/x";

type Call = { url: string; init: RequestInit };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeB2(
  overrides: Partial<
    Record<"authorize" | "uploadUrl" | "upload", Response>
  > = {},
) {
  const calls: Call[] = [];
  const fetchImpl = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url === B2_AUTHORIZE_URL) {
      return (
        overrides.authorize ??
        json({
          authorizationToken: "account-token",
          apiInfo: { storageApi: { apiUrl: API_URL, bucketId: "bucket-1" } },
        })
      );
    }
    if (url === `${API_URL}/b2api/v3/b2_get_upload_url`) {
      return (
        overrides.uploadUrl ??
        json({ uploadUrl: UPLOAD_URL, authorizationToken: "upload-token" })
      );
    }
    if (url === UPLOAD_URL) {
      return overrides.upload ?? json({ fileId: "file-1" });
    }
    throw new Error(`unexpected request to ${url}`);
  }) as typeof fetch;
  return { calls, fetchImpl };
}

function header(call: Call, name: string) {
  return new Headers(call.init.headers).get(name);
}

test("a backup is authorized, given an upload URL for the key's bucket and uploaded with its SHA-1", async () => {
  const { calls, fetchImpl } = fakeB2();

  const fileId = await uploadToB2(
    "beepollen-2026-11-07.db",
    BYTES,
    CREDENTIALS,
    fetchImpl,
  );

  assert.equal(fileId, "file-1");
  assert.deepEqual(
    calls.map((call) => call.url),
    [B2_AUTHORIZE_URL, `${API_URL}/b2api/v3/b2_get_upload_url`, UPLOAD_URL],
  );
  assert.equal(
    header(calls[0], "Authorization"),
    `Basic ${Buffer.from("key-id:secret-app-key").toString("base64")}`,
  );
  assert.equal(header(calls[1], "Authorization"), "account-token");
  assert.equal(header(calls[1], "Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    bucketId: "bucket-1",
  });
  assert.equal(header(calls[2], "Authorization"), "upload-token");
  assert.equal(header(calls[2], "Content-Type"), "application/octet-stream");
  assert.equal(header(calls[2], "X-Bz-File-Name"), "beepollen-2026-11-07.db");
  assert.equal(
    header(calls[2], "X-Bz-Content-Sha1"),
    createHash("sha1").update(BYTES).digest("hex"),
  );
  assert.deepEqual(Buffer.from(calls[2].init.body as Uint8Array), BYTES);
});

test("a key that is not restricted to one bucket uploads nothing", async () => {
  for (const storageApi of [
    { apiUrl: API_URL, bucketId: null },
    { apiUrl: API_URL },
  ]) {
    const { calls, fetchImpl } = fakeB2({
      authorize: json({
        authorizationToken: "account-token",
        apiInfo: { storageApi },
      }),
    });

    await assert.rejects(
      uploadToB2("b.db", BYTES, CREDENTIALS, fetchImpl),
      /restricted to the backup bucket/,
    );
    assert.equal(calls.length, 1);
  }
});

test("a refused step fails the upload, naming the step and never the key", async () => {
  for (const [step, overrides] of [
    ["authorization", { authorize: json({ code: "unauthorized" }, 401) }],
    ["upload URL", { uploadUrl: json({ code: "bad_request" }, 400) }],
    ["upload", { upload: json({ code: "bad_request" }, 400) }],
  ] as const) {
    const { fetchImpl } = fakeB2(overrides);
    await assert.rejects(
      uploadToB2("b.db", BYTES, CREDENTIALS, fetchImpl),
      (error: Error) => {
        assert.match(error.message, new RegExp(`B2 ${step} failed`));
        assert.doesNotMatch(error.message, /secret-app-key|key-id/);
        return true;
      },
    );
  }
});

test("an answer of an unexpected shape fails the upload", async () => {
  const { fetchImpl } = fakeB2({ upload: json({ nothing: true }) });
  await assert.rejects(
    uploadToB2("b.db", BYTES, CREDENTIALS, fetchImpl),
    /B2 upload answered unexpectedly/,
  );
});

test("credentials are read when both B2 variables are set, skipped when neither is, and refused when only one is", () => {
  assert.deepEqual(b2Credentials({ B2_KEY_ID: "a", B2_APPLICATION_KEY: "b" }), {
    keyId: "a",
    applicationKey: "b",
  });
  assert.equal(b2Credentials({}), null);
  assert.equal(b2Credentials({ B2_KEY_ID: "", B2_APPLICATION_KEY: "" }), null);
  for (const env of [
    { B2_KEY_ID: "a" },
    { B2_KEY_ID: "", B2_APPLICATION_KEY: "b" },
  ]) {
    assert.throws(() => b2Credentials(env), /must be set together/);
  }
});

function untilAborted(init?: RequestInit) {
  return new Promise<Response>((_, reject) => {
    const openSocket = setTimeout(() => {}, 5_000);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(openSocket);
      reject(init.signal?.reason);
    });
  });
}

test("a B2 call that never answers is abandoned at its timeout, whichever step hangs", async () => {
  const { fetchImpl } = fakeB2();

  for (const hanging of [
    B2_AUTHORIZE_URL,
    `${API_URL}/b2api/v3/b2_get_upload_url`,
    UPLOAD_URL,
  ]) {
    const silent = ((input: string | URL | Request, init?: RequestInit) =>
      String(input) === hanging
        ? untilAborted(init)
        : fetchImpl(input, init)) as typeof fetch;

    await assert.rejects(
      uploadToB2(
        "beepollen-2026-11-07.db",
        BYTES,
        CREDENTIALS,
        silent,
        { requestMs: 20, uploadMs: 20 },
        NO_WAIT,
      ),
      { name: "TimeoutError" },
      hanging,
    );
  }
});

const NO_WAIT = [0, 0];
const UPLOAD_URL_CALL = `${API_URL}/b2api/v3/b2_get_upload_url`;

function failingFirst(
  failures: Partial<Record<string, () => Promise<Response>>>,
) {
  const { calls, fetchImpl } = fakeB2();
  const pending = { ...failures };
  const flaky = ((input: string | URL | Request, init?: RequestInit) => {
    const fail = pending[String(input)];
    if (fail) {
      delete pending[String(input)];
      calls.push({ url: String(input), init: init ?? {} });
      return fail();
    }
    return fetchImpl(input, init);
  }) as typeof fetch;
  return { calls, flaky };
}

test("a busy pod or a dropped connection is retried with a fresh authorization and upload URL, after each wait", async () => {
  const { calls, flaky } = failingFirst({
    [B2_AUTHORIZE_URL]: () =>
      Promise.reject(
        new TypeError("fetch failed", { cause: new Error("ECONNRESET") }),
      ),
    [UPLOAD_URL]: async () => json({ code: "service_unavailable" }, 503),
  });
  const authorizedAt: number[] = [];
  const timed = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === B2_AUTHORIZE_URL) authorizedAt.push(Date.now());
    return flaky(input, init);
  }) as typeof fetch;

  const fileId = await uploadToB2(
    "b.db",
    BYTES,
    CREDENTIALS,
    timed,
    B2_TIMEOUTS,
    [20, 80],
  );

  assert.equal(fileId, "file-1");
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      B2_AUTHORIZE_URL,
      B2_AUTHORIZE_URL,
      UPLOAD_URL_CALL,
      UPLOAD_URL,
      B2_AUTHORIZE_URL,
      UPLOAD_URL_CALL,
      UPLOAD_URL,
    ],
  );
  assert.ok(authorizedAt[1] - authorizedAt[0] >= 18, "first wait");
  assert.ok(authorizedAt[2] - authorizedAt[1] >= 75, "second wait");
});

test("an upload that times out is tried again", async () => {
  let hung = false;
  const { calls, fetchImpl } = fakeB2();
  const hangsOnce = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === UPLOAD_URL && !hung) {
      hung = true;
      return untilAborted(init);
    }
    return fetchImpl(input, init);
  }) as typeof fetch;

  const fileId = await uploadToB2(
    "b.db",
    BYTES,
    CREDENTIALS,
    hangsOnce,
    { requestMs: 1_000, uploadMs: 20 },
    NO_WAIT,
  );

  assert.equal(fileId, "file-1");
  assert.equal(calls.filter((call) => call.url === B2_AUTHORIZE_URL).length, 2);
});

test("an upload still failing after three attempts fails with the last answer", async () => {
  for (const status of [408, 429, 500, 503]) {
    const { calls, fetchImpl } = fakeB2();
    const busy = ((input: string | URL | Request, init?: RequestInit) =>
      String(input) === UPLOAD_URL
        ? (calls.push({ url: UPLOAD_URL, init: init ?? {} }),
          Promise.resolve(json({ code: "busy" }, status)))
        : fetchImpl(input, init)) as typeof fetch;

    await assert.rejects(
      uploadToB2("b.db", BYTES, CREDENTIALS, busy, B2_TIMEOUTS, NO_WAIT),
      new RegExp(`B2 upload failed with HTTP ${status}`),
    );
    assert.equal(
      calls.filter((call) => call.url === UPLOAD_URL).length,
      3,
      String(status),
    );
  }
});

test("a refusal that retrying cannot fix is not retried", async () => {
  const cases: [string, typeof fetch][] = [];
  for (const status of [400, 401, 403, 499]) {
    const { fetchImpl } = fakeB2({ upload: json({ code: "no" }, status) });
    cases.push([String(status), fetchImpl]);
  }
  const { fetchImpl } = fakeB2();
  cases.push([
    "TypeError without a cause",
    ((input: string | URL | Request, init?: RequestInit) =>
      String(input) === UPLOAD_URL
        ? Promise.reject(new TypeError("invalid header value"))
        : fetchImpl(input, init)) as typeof fetch,
  ]);

  for (const [label, refusing] of cases) {
    let authorized = 0;
    const counted = ((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === B2_AUTHORIZE_URL) authorized += 1;
      return refusing(input, init);
    }) as typeof fetch;
    await assert.rejects(
      uploadToB2("b.db", BYTES, CREDENTIALS, counted, B2_TIMEOUTS, NO_WAIT),
    );
    assert.equal(authorized, 1, label);
  }
});

test("every upload gets its own name, so a deploy's copy never replaces that night's in the bucket", () => {
  const night = uploadName(
    "beepollen-2026-11-07.db",
    new Date("2026-11-07T01:00:04.120Z"),
  );
  const deploy = uploadName(
    "beepollen-2026-11-07.db",
    new Date("2026-11-07T09:31:59.999Z"),
  );
  assert.equal(night, "beepollen-2026-11-07-010004Z.db");
  assert.equal(deploy, "beepollen-2026-11-07-093159Z.db");
});
