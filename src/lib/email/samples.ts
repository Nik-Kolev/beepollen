import { randomUUID } from "node:crypto";

import { z } from "zod";

import { PREVIEWS } from "@/lib/email/previews";
import { sendEmail, type Sent } from "@/lib/email/transport";
import { contactEmailSchema } from "@/lib/orders";

export const SAMPLE_SUBJECT_PREFIX = "[Пример] ";

export const SAMPLE_DEFAULT_ADDRESS = "beepollenbg@gmail.com";

const sampleInput = z.object({ to: contactEmailSchema });

export type SampleResult = { title: string; status: Sent["status"] };

export type SamplesResult =
  { ok: true; results: SampleResult[] } | { ok: false; code: "INVALID_EMAIL" };

export async function sendSamples(
  input: unknown,
  send: typeof sendEmail = sendEmail,
): Promise<SamplesResult> {
  const parsed = sampleInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_EMAIL" };

  const run = randomUUID();
  const results: SampleResult[] = [];
  for (const [index, preview] of PREVIEWS.entries()) {
    const message = preview.render();
    const { status } = await send({
      to: parsed.data.to,
      message: {
        ...message,
        subject: `${SAMPLE_SUBJECT_PREFIX}${message.subject}`,
      },
      idempotencyKey: `sample/${run}/${index}`,
    });
    results.push({ title: preview.title, status });
  }
  return { ok: true, results };
}
