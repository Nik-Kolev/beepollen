import type { Metadata } from "next";
import Image from "next/image";

import { AdminHeader } from "@/components/admin/admin-header";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { PromotionPanel } from "@/components/admin/promotion-panel";
import {
  formatPriceInput,
  listProductsForAdmin,
  STOCK_LABEL,
} from "@/lib/admin-products";
import { promotionStatus } from "@/lib/admin-promotions";
import { requireAdmin } from "@/lib/admin-session";
import { priceHistory } from "@/lib/price-history";
import { sofiaToday } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "Продукти",
};

const STOCK_OPTIONS = Object.entries(STOCK_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export default async function AdminProducts({
  searchParams,
}: PageProps<"/admin/products">) {
  const { email } = await requireAdmin("/admin/products");
  const { history: fullHistoryOf } = await searchParams;
  const products = await listProductsForAdmin();
  const histories = await Promise.all(
    products.map((product) =>
      priceHistory(product.id, product.slug === fullHistoryOf),
    ),
  );
  const today = sofiaToday();

  return (
    <div className="w-full">
      <AdminHeader
        title="Продукти"
        email={email}
        current="/admin/products"
        legend="Сменете цената или наличността и натиснете „Запази“ — магазинът показва промяната веднага. Промоцията важи от първия до последния ден включително."
      />

      <ul role="list" className="mt-6 flex flex-col gap-4">
        {products.map((product, index) => {
          const [image] = product.images;
          const { entries, more } = histories[index];

          return (
            <li key={product.slug} id={product.slug}>
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
                  <PromotionPanel
                    slug={product.slug}
                    name={product.name}
                    regularCents={product.priceCents}
                    today={today}
                    history={entries.map((entry) =>
                      entry.type === "PRICE"
                        ? {
                            type: "PRICE",
                            id: entry.id,
                            on: sofiaToday(entry.at),
                            fromCents: entry.fromCents,
                            toCents: entry.toCents,
                            changedBy: entry.changedBy,
                          }
                        : {
                            type: "PROMOTION",
                            id: entry.id,
                            kind: entry.kind,
                            value: entry.value,
                            startsOn: entry.startsOn,
                            endsOn: entry.endsOn,
                            endedOn: entry.endedAt && sofiaToday(entry.endedAt),
                            status: promotionStatus(entry, today),
                          },
                    )}
                    moreHref={
                      more
                        ? `/admin/products?history=${product.slug}#${product.slug}`
                        : null
                    }
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
