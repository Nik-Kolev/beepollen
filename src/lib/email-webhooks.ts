import { Resend, type WebhookEventPayload } from "resend";

import { Prisma } from "@/generated/prisma/client";
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

export const TRANSIENT_BOUNCES_TO_UNSUBSCRIBE = 2;

async function recordBounce(
  emailId: string,
  to: string[],
  permanent: boolean,
  now: Date,
) {
  const emails = to.map((address) => address.trim().toLowerCase());
  try {
    await prisma.$transaction(async (tx) => {
      const already = await tx.emailBounce.count({
        where: { resendEmailId: emailId },
      });
      if (already > 0) return;

      const customer = await tx.customer.findFirst({
        where: { email: { in: emails } },
        select: { id: true },
      });
      if (!customer) return;

      await tx.emailBounce.create({
        data: {
          customerId: customer.id,
          resendEmailId: emailId,
          permanent,
          createdAt: now,
        },
      });

      const ofCustomer = {
        kind: "OFFERS" as const,
        withdrawnAt: null,
        order: { customerId: customer.id },
      };
      const since = await tx.consent.findFirst({
        where: ofCustomer,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (!since) return;

      const transient = await tx.emailBounce.count({
        where: {
          customerId: customer.id,
          permanent: false,
          createdAt: { gte: since.createdAt },
        },
      });
      if (permanent || transient >= TRANSIENT_BOUNCES_TO_UNSUBSCRIBE) {
        await tx.consent.updateMany({
          where: ofCustomer,
          data: { withdrawnAt: now },
        });
      }
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }
}

export async function handleEmailEvent(
  event: WebhookEventPayload,
  now = new Date(),
) {
  if (event.type === "email.bounced") {
    const emailId = event.data.email_id;
    if (!emailId) return;
    await prisma.orderEvent.updateMany({
      where: { resendEmailId: emailId },
      data: { emailStatus: "BOUNCED" },
    });
    await prisma.campaignRecipient.updateMany({
      where: { resendEmailId: emailId },
      data: { status: "BOUNCED" },
    });
    await recordBounce(
      emailId,
      event.data.to,
      event.data.bounce?.type?.toLowerCase() === "permanent",
      now,
    );
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
