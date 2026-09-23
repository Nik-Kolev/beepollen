"use server";

import { headers } from "next/headers";

import { placeOrder, type PlaceOrderResult } from "@/lib/orders";

// formData.get returns File | string | null, and this endpoint is public.
function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function items(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

async function clientIp() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");

  if (forwarded) return forwarded.split(",")[0]?.trim() || null;

  return requestHeaders.get("x-real-ip");
}

export async function submitOrder(
  _previous: PlaceOrderResult | null,
  formData: FormData,
): Promise<PlaceOrderResult> {
  return placeOrder(
    {
      name: text(formData.get("name")),
      email: text(formData.get("email")),
      phone: text(formData.get("phone")),
      items: items(formData.get("items")),
      acceptsTerms: formData.get("acceptsTerms") === "on",
      acceptsOffers: formData.get("acceptsOffers") === "on",
      idempotencyKey: text(formData.get("idempotencyKey")),
      website: text(formData.get("website")),
    },
    await clientIp(),
  );
}
