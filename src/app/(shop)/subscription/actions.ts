"use server";

import { redirect } from "next/navigation";

import { unsubscribe } from "@/lib/subscriptions";

function tokenFrom(formData: FormData) {
  const token = formData.get("token");
  return typeof token === "string" ? token : "";
}

export async function unsubscribeAction(formData: FormData) {
  const result = await unsubscribe(tokenFrom(formData));
  redirect(`/subscription/unsubscribe?result=${result}`);
}
