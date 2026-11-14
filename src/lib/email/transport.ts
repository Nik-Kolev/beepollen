import { Resend } from "resend";

import type { EmailStatus } from "@/generated/prisma/enums";
import type { EmailMessage } from "@/lib/email/templates";
import prisma from "@/lib/prisma";

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

type RecordSend = (status: "SENT" | "FAILED") => Promise<unknown>;

const writeSend: RecordSend = (status) =>
  prisma.emailSend.create({ data: { status } });

export async function sendEmail(
  { to, message, idempotencyKey, headers }: Outgoing,
  env: EmailEnv = process.env,
  client: EmailClient | null = env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : null,
  record: RecordSend = writeSend,
): Promise<Sent> {
  if (!client) return { status: "SKIPPED", resendEmailId: null };

  if (!env.EMAIL_REPLY_TO) {
    console.error(
      `Email "${message.subject}" to one recipient failed: EMAIL_REPLY_TO is not set`,
    );
    return { status: "FAILED", resendEmailId: null };
  }

  async function note(status: "SENT" | "FAILED") {
    try {
      await record(status);
    } catch (error) {
      console.error("Recording an email send failed:", error);
    }
  }

  try {
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

    await note("SENT");
    return { status: "SENT", resendEmailId: data?.id ?? null };
  } catch (error) {
    console.error(`Email "${message.subject}" to one recipient failed:`, error);
    await note("FAILED");
    return { status: "FAILED", resendEmailId: null };
  }
}
