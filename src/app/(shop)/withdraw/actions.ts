"use server";

import { after } from "next/server";

import { clientIp } from "@/lib/client-ip";
import { sendWithdrawalEmails } from "@/lib/order-emails";
import { withdrawFromOrder, type WithdrawalResult } from "@/lib/withdrawal";
import { withdrawalPayload } from "@/lib/withdrawal-payload";

export async function submitWithdrawal(
  _previous: WithdrawalResult | null,
  formData: FormData,
): Promise<WithdrawalResult> {
  const result = await withdrawFromOrder(
    withdrawalPayload(formData),
    await clientIp(),
  );

  if (result.ok && !result.repeated) {
    const { reference } = result;
    after(() => sendWithdrawalEmails(reference));
  }
  return result;
}
