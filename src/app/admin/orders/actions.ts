"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import {
  orderStepInput,
  recordOrderStep,
  type OrderStepResult,
} from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";
import { listEcontOffices } from "@/lib/delivery-offices";
import type { EcontOffice } from "@/lib/econt";
import { listPublishedProductsForCart } from "@/lib/products";
import {
  editOrderContact,
  orderEditNotify,
  type OrderEditResult,
} from "@/lib/order-edit";
import { isEmailStep, sendEditEmail, sendStepEmail } from "@/lib/order-emails";

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
    email,
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
  const result = await editOrderContact(input, { adminEmail: email });
  if (result.ok && result.eventId !== null) {
    const { reference, eventId, offersUnconfirmed } = result;
    const notify = orderEditNotify.safeParse(input);
    if (notify.success && notify.data.notify) {
      after(() => sendEditEmail(reference, eventId, offersUnconfirmed));
    }
    refresh();
  }
  return result;
}

export async function previewOrderEdit(
  input: unknown,
): Promise<OrderEditResult> {
  await requireAdmin();
  return editOrderContact(input, { dryRun: true });
}

export async function loadEditOptions(): Promise<{
  offices: EcontOffice[];
  products: { slug: string; name: string }[];
}> {
  await requireAdmin();
  const [offices, products] = await Promise.all([
    listEcontOffices(),
    listPublishedProductsForCart(),
  ]);
  return {
    offices,
    products: products
      .filter((product) => product.stock !== "NONE" && product.priceCents > 0)
      .map(({ slug, name }) => ({ slug, name })),
  };
}
