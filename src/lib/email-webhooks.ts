import { Resend, type WebhookEventPayload } from "resend";

import prisma from "@/lib/prisma";

export const MAX_WEBHOOK_BYTES = 64 * 1024;

type WebhookEnv = Record<string, string | undefined> & {
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
};

async function readCapped(request: Request, limit: number) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readWebhookEvent(
  request: Request,
  env: WebhookEnv = process.env,
): Promise<WebhookEventPayload | null> {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!env.RESEND_API_KEY || !env.RESEND_WEBHOOK_SECRET) return null;
  if (!id || !timestamp || !signature) return null;

  const payload = await readCapped(request, MAX_WEBHOOK_BYTES);
  if (payload === null) return null;

  try {
    return new Resend(env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return null;
  }
}

export async function handleEmailEvent(
  event: WebhookEventPayload,
  now = new Date(),
) {
  if (event.type === "email.bounced") {
    if (!event.data.email_id) return;
    await prisma.orderEvent.updateMany({
      where: { resendEmailId: event.data.email_id },
      data: { emailStatus: "BOUNCED" },
    });
    return;
  }

  if (event.type === "email.complained") {
    const emails = event.data.to.map((address) => address.trim().toLowerCase());
    await prisma.consent.updateMany({
      where: {
        kind: "OFFERS",
        withdrawnAt: null,
        order: { customer: { email: { in: emails } } },
      },
      data: { withdrawnAt: now },
    });
  }
}
