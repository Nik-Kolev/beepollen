"use server";

import { revalidatePath } from "next/cache";

import { editProduct, type ProductEditResult } from "@/lib/admin-products";
import {
  endPromotion,
  type PromotionEndResult,
  type PromotionSaveResult,
  savePromotion,
} from "@/lib/admin-promotions";
import { requireAdmin } from "@/lib/admin-session";

function revalidateShop(slug: string) {
  for (const path of ["/", "/cart", "/checkout", `/products/${slug}`]) {
    revalidatePath(path);
  }
  revalidatePath("/admin/products");
}

export async function saveProduct(input: unknown): Promise<ProductEditResult> {
  await requireAdmin();
  const result = await editProduct(input);
  if (result.ok) revalidateShop(result.slug);
  return result;
}

export async function savePromotionAction(
  input: unknown,
): Promise<PromotionSaveResult> {
  const { email } = await requireAdmin();
  const result = await savePromotion(input, email);
  if (result.ok) revalidateShop(result.slug);
  return result;
}

export async function endPromotionAction(
  id: unknown,
): Promise<PromotionEndResult> {
  await requireAdmin();
  const result = await endPromotion(id);
  if (result.ok) revalidateShop(result.slug);
  return result;
}
