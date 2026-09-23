"use server";

import { headers } from "next/headers";

import { checkoutPayload } from "@/lib/checkout-payload";
import { placeOrder, type PlaceOrderResult } from "@/lib/orders";

// A caller sets the front of x-forwarded-for itself, so only the proxy's own
// header and the hop it appended are worth rate limiting on.
async function clientIp() {
  const requestHeaders = await headers();
  const real = requestHeaders.get("x-real-ip")?.trim();

  if (real) return real;

  const hops = requestHeaders.get("x-forwarded-for")?.split(",") ?? [];

  return hops[hops.length - 1]?.trim() || null;
}

export async function submitOrder(
  _previous: PlaceOrderResult | null,
  formData: FormData,
): Promise<PlaceOrderResult> {
  return placeOrder(checkoutPayload(formData), await clientIp());
}
