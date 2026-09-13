import Image from "next/image";

import { Bee } from "@/components/art/bee";
import {
  HoneycombMark,
  type HoneycombVariant,
} from "@/components/art/honeycomb-mark";
import { formatPrice } from "@/lib/money";
import type { ProductListItem } from "@/lib/products";

// The grid repeats this three-card rhythm instead of storing decoration per
// product: it is styling, and a column would have to be filled for every row.
const DECOR: readonly { comb: HoneycombVariant; bee: string | null }[] = [
  { comb: "climb", bee: "top-3 right-3 w-10 -rotate-12" },
  { comb: "climbRight", bee: null },
  { comb: "climbStep", bee: "bottom-3 left-3 w-9 rotate-6" },
];

export function ProductCard({
  product,
  index,
}: {
  product: ProductListItem;
  index: number;
}) {
  const decor = DECOR[index % DECOR.length];
  const image = product.images[0];

  return (
    <article className="bg-surface ring-line flex h-full flex-col overflow-hidden rounded-xl shadow-sm ring-1">
      <div className="relative">
        <div className="bg-placeholder relative aspect-square">
          {image && (
            <Image
              src={image.path}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {decor.bee && <Bee className={`text-bee-dark absolute ${decor.bee}`} />}
      </div>

      <div className="flex flex-1 gap-4 px-4 py-5">
        <HoneycombMark
          variant={decor.comb}
          className="text-brand-deep h-16 w-auto shrink-0 self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-ink-soft mt-1 line-clamp-3 text-sm">
            {product.summary}
          </p>
          <p className="text-brand-deep mt-auto pt-3 font-semibold">
            {product.priceCents > 0
              ? formatPrice(product.priceCents)
              : "TODO: цена"}
          </p>
        </div>
      </div>
    </article>
  );
}
