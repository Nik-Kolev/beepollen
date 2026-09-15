"use client";

import Image from "next/image";
import { useState, ViewTransition } from "react";

import type { ProductDetail } from "@/lib/products";
import { productPhotoTransitionName } from "@/lib/view-transition";

export function ProductGallery({
  slug,
  images,
}: {
  slug: string;
  images: ProductDetail["images"];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <ViewTransition
        name={productPhotoTransitionName(slug)}
        share="morph"
        default="none"
      >
        <div className="bg-placeholder ring-line relative aspect-square overflow-hidden rounded-xl ring-1">
          {active && (
            <Image
              src={active.path}
              alt={active.alt}
              fill
              preload
              sizes="(min-width: 1152px) 524px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
      </ViewTransition>

      {images.length > 1 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
                className={`block overflow-hidden rounded-lg transition-shadow ${
                  index === activeIndex
                    ? "ring-brand ring-2"
                    : "ring-line hover:ring-brand-deep ring-1"
                }`}
              >
                <Image
                  src={image.path}
                  alt={image.alt}
                  width={80}
                  height={80}
                  className="size-20 object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
