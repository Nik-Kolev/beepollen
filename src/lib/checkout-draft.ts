import { z } from "zod";

export const CHECKOUT_DRAFT_KEY = "beepollen.checkout";

const DRAFT_VERSION = 1;

const draftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  localDelivery: z.boolean(),
  city: z.string().min(1).nullable(),
  officeCode: z.string().min(1).nullable(),
});

export type CheckoutDraft = Omit<z.infer<typeof draftSchema>, "version">;

export function parseDraft(raw: string | null): CheckoutDraft | null {
  if (!raw) return null;

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = draftSchema.safeParse(value);

  if (!result.success) return null;

  const { name, email, phone, localDelivery, city, officeCode } = result.data;

  return { name, email, phone, localDelivery, city, officeCode };
}

export function serializeDraft(draft: CheckoutDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, ...draft });
}

export function readDraft(): CheckoutDraft | null {
  try {
    return parseDraft(sessionStorage.getItem(CHECKOUT_DRAFT_KEY));
  } catch {
    return null;
  }
}

export function writeDraft(draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, serializeDraft(draft));
  } catch {}
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {}
}
