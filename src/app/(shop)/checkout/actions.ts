"use server";

import { after } from "next/server";

import { checkoutPayload } from "@/lib/checkout-payload";
import { clientIp } from "@/lib/client-ip";
import { sendPlacedEmails } from "@/lib/order-emails";
import { placeOrder, type PlaceOrderResult } from "@/lib/orders";

export async function submitOrder(
  _previous: PlaceOrderResult | null,
  formData: FormData,
): Promise<PlaceOrderResult> {
  const result = await placeOrder(checkoutPayload(formData), await clientIp());

  if (result.ok) {
    const { reference } = result.order;
    after(() => sendPlacedEmails(reference, result.repeated));
  }
  return result;
}
