"use server";

import { clientIp } from "@/lib/client-ip";
import { withdrawFromOrder, type WithdrawalResult } from "@/lib/withdrawal";
import { withdrawalPayload } from "@/lib/withdrawal-payload";

export async function submitWithdrawal(
  _previous: WithdrawalResult | null,
  formData: FormData,
): Promise<WithdrawalResult> {
  return withdrawFromOrder(withdrawalPayload(formData), await clientIp());
}
