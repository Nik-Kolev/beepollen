import { readEmailToken, signEmailToken } from "@/lib/email-token";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export type UnsubscribeResult = "unsubscribed" | "invalid";

export async function isSubscribed(customerId: number) {
  const active = await prisma.consent.count({
    where: { kind: "OFFERS", withdrawnAt: null, order: { customerId } },
  });
  return active > 0;
}

export async function unsubscribe(
  token: string,
  now = new Date(),
): Promise<UnsubscribeResult> {
  const customerId = readEmailToken(token, "unsubscribe");
  if (!customerId) return "invalid";

  await prisma.consent.updateMany({
    where: { kind: "OFFERS", withdrawnAt: null, order: { customerId } },
    data: { withdrawnAt: now },
  });
  return "unsubscribed";
}

export function unsubscribeUrl(customerId: number) {
  return `${SITE_URL}/subscription/unsubscribe?token=${signEmailToken("unsubscribe", customerId)}`;
}

export function unsubscribeHeaders(customerId: number) {
  return {
    "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?token=${signEmailToken("unsubscribe", customerId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
