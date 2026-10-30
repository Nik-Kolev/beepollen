import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isRevalidateAuthorized(
  authorization: string | null,
  env: Record<string, string | undefined> = process.env,
) {
  const secret = env.REVALIDATE_SECRET;
  if (!secret || secret.length < 32 || !authorization) return false;

  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
