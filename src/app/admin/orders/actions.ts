"use server";

import { refresh } from "next/cache";

import { orderMarkInput, setOrderMark } from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/admin-session";

export async function markOrder(input: unknown) {
  await requireAdmin();
  const parsed = orderMarkInput.safeParse(input);
  if (!parsed.success) return;

  const { reference, mark, on } = parsed.data;
  await setOrderMark(reference, mark, on);
  refresh();
}
