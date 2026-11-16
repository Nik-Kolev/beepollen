"use server";

import { requireAdmin } from "@/lib/admin-session";
import { type OwnerAnswerResult, saveOwnerAnswer } from "@/lib/owner-answers";

export async function saveAnswer(input: unknown): Promise<OwnerAnswerResult> {
  const { email } = await requireAdmin();
  return saveOwnerAnswer(input, email);
}
