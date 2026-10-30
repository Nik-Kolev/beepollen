import type { Metadata } from "next";
import Image from "next/image";

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
      <AdminHeader
        title="Продукти"
        email={email}
        current="/admin/products"
        legend="Сменете цената или наличността и натиснете „Запази“ — магазинът показва промяната веднага."
      />

      <ul role="list" className="mt-6 flex flex-col gap-4">
        {products.map((product) => {
          const [image] = product.images;

          return (
            <li key={product.slug}>
              <article className="bg-surface ring-line grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl p-4 shadow-sm ring-1 sm:items-start">
                <div className="bg-placeholder relative size-20 overflow-hidden rounded-lg sm:row-span-2 sm:size-32 lg:size-40">
                  {image && (
                    <Image
                      src={image.path}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 640px) 128px, 80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <h2 className="text-lg font-semibold">{product.name}</h2>
                <div className="col-span-2 sm:col-span-1 sm:col-start-2">
                  <ProductEditForm
                    slug={product.slug}
                    name={product.name}
                    price={formatPriceInput(product.priceCents)}
                    stock={product.stock}
                    stockOptions={STOCK_OPTIONS}
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
