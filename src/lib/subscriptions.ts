import { readEmailToken, signEmailToken } from "@/lib/email-token";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export type ConfirmResult = "confirmed" | "invalid";
export type UnsubscribeResult = "unsubscribed" | "invalid";

const ACTIVE = {
  kind: "OFFERS",
  confirmedAt: { not: null },
  withdrawnAt: null,
} as const;

export async function isSubscribed(customerId: number) {
  const active = await prisma.consent.count({
    where: { ...ACTIVE, order: { customerId } },
  });
  return active > 0;
}

export async function confirmSubscription(
  token: string,
  now = new Date(),
): Promise<ConfirmResult> {
  const id = readEmailToken(token, "confirm");
  if (!id) return "invalid";

  const { count } = await prisma.consent.updateMany({
    where: { id, kind: "OFFERS", confirmedAt: null, withdrawnAt: null },
    data: { confirmedAt: now },
  });
  if (count > 0) return "confirmed";

  const confirmed = await prisma.consent.count({ where: { ...ACTIVE, id } });
  return confirmed > 0 ? "confirmed" : "invalid";
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

export function confirmUrl(consentId: number) {
  return `${SITE_URL}/subscription/confirm?token=${signEmailToken("confirm", consentId)}`;
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
