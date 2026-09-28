"use server";

import { revalidatePath } from "next/cache";

import { editProduct, type ProductEditResult } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/admin-session";

export async function saveProduct(input: unknown): Promise<ProductEditResult> {
  await requireAdmin();
  const result = await editProduct(input);
  if (result.ok) {
    for (const path of [
      "/",
      "/cart",
      "/checkout",
      `/products/${result.slug}`,
    ]) {
      revalidatePath(path);
    }
  }
  return result;
}
