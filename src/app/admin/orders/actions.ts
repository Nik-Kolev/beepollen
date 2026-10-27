"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import {
  orderStepInput,
  recordOrderStep,
  type OrderStepResult,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { editOrderContact, type OrderEditResult } from "@/lib/order-edit";
import { isEmailStep, sendStepEmail } from "@/lib/order-emails";

export async function advanceOrder(input: unknown): Promise<OrderStepResult> {
  const { email } = await requireAdmin();
  const parsed = orderStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "refused" };

  const { reference, step, expected, confirmed, notify } = parsed.data;
  const { result, eventId } = await recordOrderStep(
    reference,
    step,
    expected,
    new Date(),
    confirmed ?? false,
    email ?? null,
  );
  if (result.ok) {
    if (notify && eventId !== null && isEmailStep(step)) {
      after(() => sendStepEmail(reference, step, eventId));
    }
    refresh();
  }
  return result;
}

export async function editOrder(input: unknown): Promise<OrderEditResult> {
  const { email } = await requireAdmin();
  const result = await editOrderContact(input, new Date(), email ?? null);
  if (result.ok && result.eventId !== null) refresh();
  return result;
}
