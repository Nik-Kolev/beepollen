"use server";

import { redirect } from "next/navigation";

import { confirmSubscription, unsubscribe } from "@/lib/subscriptions";

function tokenFrom(formData: FormData) {
  const token = formData.get("token");
  return typeof token === "string" ? token : "";
}

export async function confirmAction(formData: FormData) {
  const result = await confirmSubscription(tokenFrom(formData));
  redirect(`/subscription/confirm?result=${result}`);
}

export async function unsubscribeAction(formData: FormData) {
  const result = await unsubscribe(tokenFrom(formData));
  redirect(`/subscription/unsubscribe?result=${result}`);
}
