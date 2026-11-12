import { createHash } from "node:crypto";

import { z } from "zod";

export const B2_AUTHORIZE_URL =
  "https://api.backblazeb2.com/b2api/v3/b2_authorize_account";

export const UPLOAD_FAILED_EXIT_CODE = 2;

export const B2_TIMEOUTS = { requestMs: 30_000, uploadMs: 5 * 60_000 };

export type B2Credentials = { keyId: string; applicationKey: string };

const authorization = z.object({
  authorizationToken: z.string().min(1),
  apiInfo: z.object({
    storageApi: z.object({
      apiUrl: z.url(),
      bucketId: z.string().min(1).nullish(),
    }),
  }),
});

const uploadUrl = z.object({
  uploadUrl: z.url(),
  authorizationToken: z.string().min(1),
});

const uploaded = z.object({ fileId: z.string().min(1) });

export function uploadName(backupName: string, now: Date) {
  const time = now.toISOString().slice(11, 19).replaceAll(":", "");
  return backupName.replace(/\.db$/, `-${time}Z.db`);
}

export function b2Credentials(
  env: Record<string, string | undefined>,
): B2Credentials | null {
  const keyId = env.B2_KEY_ID;
  const applicationKey = env.B2_APPLICATION_KEY;
  if (!keyId && !applicationKey) return null;
  if (!keyId || !applicationKey) {
    throw new Error("B2_KEY_ID and B2_APPLICATION_KEY must be set together");
  }
  return { keyId, applicationKey };
}

async function call<T>(
  step: string,
  schema: z.ZodType<T>,
  response: Response,
): Promise<T> {
  if (!response.ok) {
    throw new Error(`B2 ${step} failed with HTTP ${response.status}`);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`B2 ${step} answered unexpectedly`);
  return parsed.data;
}

export async function uploadToB2(
  name: string,
  bytes: Buffer,
  { keyId, applicationKey }: B2Credentials,
  fetchImpl: typeof fetch = fetch,
  { requestMs, uploadMs } = B2_TIMEOUTS,
): Promise<string> {
  const basic = Buffer.from(`${keyId}:${applicationKey}`).toString("base64");
  const account = await call(
    "authorization",
    authorization,
    await fetchImpl(B2_AUTHORIZE_URL, {
      headers: { Authorization: `Basic ${basic}` },
      signal: AbortSignal.timeout(requestMs),
    }),
  );

  const { apiUrl, bucketId } = account.apiInfo.storageApi;
  if (!bucketId) {
    throw new Error("The B2 key must be restricted to the backup bucket");
  }

  const target = await call(
    "upload URL",
    uploadUrl,
    await fetchImpl(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: account.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
      signal: AbortSignal.timeout(requestMs),
    }),
  );

  const file = await call(
    "upload",
    uploaded,
    await fetchImpl(target.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: target.authorizationToken,
        "X-Bz-File-Name": encodeURIComponent(name),
        "Content-Type": "application/octet-stream",
        "X-Bz-Content-Sha1": createHash("sha1").update(bytes).digest("hex"),
      },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(uploadMs),
    }),
  );
  return file.fileId;
}
