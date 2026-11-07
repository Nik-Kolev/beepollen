"use server";

import { requireAdmin } from "@/lib/admin-session";
import { type SamplesResult, sendSamples } from "@/lib/email/samples";
import { type OwnerAnswerResult, saveOwnerAnswer } from "@/lib/owner-answers";

export async function saveAnswer(input: unknown): Promise<OwnerAnswerResult> {
  const { email } = await requireAdmin();
  return saveOwnerAnswer(input, email);
}

export async function sendSampleEmails(input: unknown): Promise<SamplesResult> {
  await requireAdmin();
  return sendSamples(input);
}
