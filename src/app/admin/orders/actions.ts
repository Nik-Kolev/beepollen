"use server";

import { refresh } from "next/cache";

import {
  applyOrderStep,
  orderStepInput,
  type OrderStepResult,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";

export async function advanceOrder(input: unknown): Promise<OrderStepResult> {
  const { email } = await requireAdmin();
  const parsed = orderStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "refused" };

  const { reference, step, expected, confirmed } = parsed.data;
  const result = await applyOrderStep(
    reference,
    step,
    expected,
    new Date(),
    confirmed,
    email ?? null,
  );
  if (result.ok) refresh();
  return result;
}
