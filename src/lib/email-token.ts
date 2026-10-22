import { createHmac, timingSafeEqual } from "node:crypto";

export type EmailTokenPurpose = "confirm" | "unsubscribe";

const TOKEN = /^(confirm|unsubscribe)\.([1-9]\d{0,9})\.([A-Za-z0-9_-]{43})$/;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function tokenSecret(env: Record<string, string | undefined>) {
  const secret = env.EMAIL_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_TOKEN_SECRET must be at least 32 characters");
  }
  return secret;
}

export function signEmailToken(
  purpose: EmailTokenPurpose,
  id: number,
  env: Record<string, string | undefined> = process.env,
) {
  const payload = `${purpose}.${id}`;
  return `${payload}.${signature(payload, tokenSecret(env))}`;
}

export function readEmailToken(
  token: string,
  purpose: EmailTokenPurpose,
  env: Record<string, string | undefined> = process.env,
): number | null {
  const match = TOKEN.exec(token);
  if (!match || match[1] !== purpose) return null;

  let secret: string;
  try {
    secret = tokenSecret(env);
  } catch (error) {
    console.error("Email token could not be checked:", error);
    return null;
  }

  const expected = Buffer.from(signature(`${match[1]}.${match[2]}`, secret));
  if (!timingSafeEqual(expected, Buffer.from(match[3]))) return null;

  return Number(match[2]);
}
