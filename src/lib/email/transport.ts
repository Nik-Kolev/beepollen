import { Resend } from "resend";

import type { EmailStatus } from "@/generated/prisma/enums";
import type { EmailMessage } from "@/lib/email/templates";

const TEST_SENDER = "Пчелни продукти Д & Н Димитрови <onboarding@resend.dev>";

export type EmailClient = Pick<Resend, "emails">;

type EmailEnv = Record<string, string | undefined> & {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
};

export type Outgoing = {
  to: string;
  message: EmailMessage;
  idempotencyKey: string;
  headers?: Record<string, string>;
};

export type Sent = {
  status: Exclude<EmailStatus, "BOUNCED">;
  resendEmailId: string | null;
};

export async function sendEmail(
  { to, message, idempotencyKey, headers }: Outgoing,
  env: EmailEnv = process.env,
  client: EmailClient | null = env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : null,
): Promise<Sent> {
  if (!client) return { status: "SKIPPED", resendEmailId: null };

  try {
    if (!env.EMAIL_REPLY_TO) throw new Error("EMAIL_REPLY_TO is not set");

    const { data, error } = await client.emails.send(
      {
        from: env.EMAIL_FROM || TEST_SENDER,
        to,
        replyTo: env.EMAIL_REPLY_TO,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers,
      },
      { idempotencyKey },
    );
    if (error) throw new Error(`${error.name}: ${error.message}`);

    return { status: "SENT", resendEmailId: data?.id ?? null };
  } catch (error) {
    console.error(`Email "${message.subject}" to one recipient failed:`, error);
    return { status: "FAILED", resendEmailId: null };
  }
}
