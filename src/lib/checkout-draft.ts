import { z } from "@/lib/zod";

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

export const CHECKOUT_SCROLL_KEY = "beepollen.checkout-scroll";

const heldScrollSchema = z.object({
  y: z.number().int().positive(),
  href: z.string(),
});

let heldScrollTaken = false;

function forgetHeldScroll() {
  try {
    sessionStorage.removeItem(CHECKOUT_SCROLL_KEY);
  } catch {}
}

export function holdScroll() {
  history.scrollRestoration = "manual";
  try {
    sessionStorage.setItem(
      CHECKOUT_SCROLL_KEY,
      JSON.stringify({ y: Math.round(scrollY), href: location.href }),
    );
  } catch {}
}

export function releaseScroll() {
  const release = () => {
    history.scrollRestoration = "auto";
  };

  if (document.readyState === "complete") release();
  else addEventListener("load", () => setTimeout(release), { once: true });
}

export function releaseRestoredScroll(event: PageTransitionEvent) {
  if (!event.persisted) return;

  forgetHeldScroll();
  history.scrollRestoration = "auto";
}

export function takeHeldScroll(): number | null {
  if (heldScrollTaken) return null;
  heldScrollTaken = true;

  let raw: string | null;

  try {
    raw = sessionStorage.getItem(CHECKOUT_SCROLL_KEY);
  } catch {
    return null;
  }
  forgetHeldScroll();

  const [navigation] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  const returning =
    navigation?.type === "reload" || navigation?.type === "back_forward";

  let held: unknown;

  try {
    held = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }

  const result = heldScrollSchema.safeParse(held);

  return returning &&
    result.success &&
    result.data.href === location.href &&
    result.data.href === navigation.name
    ? result.data.y
    : null;
}
