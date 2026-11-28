"use server";

import { after } from "next/server";

import { clientIp } from "@/lib/client-ip";
import {
  sendUnmatchedWithdrawalEmail,
  sendWithdrawalEmails,
} from "@/lib/order-emails";
import {
  publicWithdrawalResult,
  withdrawFromOrder,
  type WithdrawalResult,
} from "@/lib/withdrawal";
import { withdrawalPayload } from "@/lib/withdrawal-payload";

export async function submitWithdrawal(
  _previous: WithdrawalResult | null,
  formData: FormData,
): Promise<WithdrawalResult> {
  const outcome = await withdrawFromOrder(
    withdrawalPayload(formData),
    await clientIp(),
  );

  if (outcome.ok && !outcome.repeated) {
    const { reference } = outcome;
    after(() => sendWithdrawalEmails(reference));
  }
  if (!outcome.ok && outcome.code === "UNMATCHED" && outcome.notifyOwner) {
    const { eventId } = outcome;
    after(() => sendUnmatchedWithdrawalEmail(eventId));
  }
  return publicWithdrawalResult(outcome);
}
