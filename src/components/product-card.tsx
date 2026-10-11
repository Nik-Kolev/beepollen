import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import { Bee } from "@/components/art/bee";
import {
  HoneycombMark,
  type HoneycombVariant,
} from "@/components/art/honeycomb-mark";
import { formatPrice } from "@/lib/money";
import type { ProductListItem } from "@/lib/products";
import { productPhotoTransitionName } from "@/lib/view-transition";

const DECOR: readonly {
  comb: HoneycombVariant;
  photoBee: string | null;
  cardBee: string | null;
}[] = [
  {
    comb: "climb",
    photoBee: null,
    cardBee:
      "w-9 scale-x-[-1] rotate-20 @min-[680px]:scale-x-100 @min-[680px]:-rotate-20",
  },
  {
    comb: "climbRight",
    photoBee: "bottom-3 left-3 w-9 -rotate-6",
    cardBee: null,
  },
  { comb: "climbStep", photoBee: null, cardBee: null },
];

export function ProductCard({
  product,
  index,
  aboveFold = false,
}: {
  product: ProductListItem;
  index: number;
  aboveFold?: boolean;
}) {
  const decor = DECOR[index % DECOR.length];
  const image = product.images[0];

  return (
    <article className="bg-surface ring-line relative flex h-full flex-col overflow-hidden rounded-xl shadow-sm ring-1 transition-shadow hover:shadow-md">
      <div className="relative">
        <ViewTransition
          name={productPhotoTransitionName(product.slug)}
          share="morph"
          default="none"
        >
          <div className="bg-placeholder relative aspect-square">
            {image && (
              <Image
                src={image.path}
                alt={image.alt}
                fill
                loading={aboveFold ? "eager" : "lazy"}
                fetchPriority={aboveFold ? "high" : "auto"}
                sizes="(min-width: 1152px) 532px, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            )}
          </div>
        </ViewTransition>
        {decor.photoBee && (
          <Bee className={`text-bee-dark absolute ${decor.photoBee}`} />
        )}
      </div>

      <div className="flex flex-1 gap-4 px-4 py-5">
        <HoneycombMark
          variant={decor.comb}
          className="text-brand-deep h-16 w-auto shrink-0 self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-medium">
            <Link
              href={`/products/${product.slug}`}
              className="after:absolute after:inset-0"
            >
              {product.name}
            </Link>
          </h3>
          <p className="text-ink-soft mt-1 line-clamp-3 text-sm">
            {product.summary}
          </p>
          <p className="text-brand-deep mt-auto pt-3 font-semibold">
            {product.priceCents > 0
              ? formatPrice(product.priceCents)
              : "TODO: цена"}
          </p>
        </div>
        {decor.cardBee && (
          <Bee
            className={`text-bee-dark pointer-events-none shrink-0 self-start ${decor.cardBee}`}
          />
        )}
      </div>
    </article>
  );
}
