import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import {
  formatPriceInput,
  listProductsForAdmin,
  STOCK_LABEL,
} from "@/lib/admin-products";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Продукти",
};

const STOCK_OPTIONS = Object.entries(STOCK_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export default async function AdminProducts() {
  const { email } = await requireAdmin();
  const products = await listProductsForAdmin();

  return (
    <div className="w-full">
      <AdminHeader title="Продукти" email={email} current="/admin/products" />

      <ul role="list" className="mt-6 flex flex-col gap-3">
        {products.map((product) => (
          <li key={product.slug}>
            <article className="bg-surface border-line rounded-md border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-semibold">{product.name}</h2>
                {!product.isPublished && (
                  <span className="text-ink-soft text-sm">Непубликуван</span>
                )}
              </div>
              <ProductEditForm
                slug={product.slug}
                name={product.name}
                price={formatPriceInput(product.priceCents)}
                stock={product.stock}
                stockOptions={STOCK_OPTIONS}
              />
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
